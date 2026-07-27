#!/usr/bin/env python3
"""Thin Agent-facing adapter for the eight canonical Etsy tools.

Input is one JSON object on stdin. Runtime tenant/auth are injected from env.
Stdout contains exactly one final JSON object; transport polling identifiers
never appear in successful tool output.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "etsy-agent-tool/v1"
TOOLS = {
    "etsy_listings_get",
    "etsy_customer_messages_get",
    "etsy_customer_messages_publish",
    "get_etsy_orders",
    "get_etsy_stats",
    "describe_etsy_stats",
    "summarize_etsy_stats",
    "get_etsy_ads",
}
RUNTIME_FIELDS = {
    "tenantId",
    "authorization",
    "bearerToken",
    "browserToolToken",
    "hermesToolToken",
    "requestId",
    "operationId",
}


class ToolFailure(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        retryable: bool = False,
        safe_to_retry: bool = False,
        action_required: str | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.retryable = retryable
        self.safe_to_retry = safe_to_retry
        self.action_required = action_required


def envelope(
    tool: str,
    outcome: str,
    *,
    data: dict[str, Any] | None = None,
    errors: list[dict[str, Any]] | None = None,
    truncated: bool = False,
    next_cursor: str = "",
) -> dict[str, Any]:
    payload = data or {}
    return {
        "schemaVersion": SCHEMA_VERSION,
        "tool": tool,
        "ok": outcome in {"complete", "partial"},
        "outcome": outcome,
        "data": payload,
        "completeness": {
            "status": outcome,
            "truncated": bool(truncated),
            **({"nextCursor": next_cursor} if next_cursor else {}),
        },
        "errors": errors or [],
    }


def failed_envelope(tool: str, error: ToolFailure) -> dict[str, Any]:
    detail = {
        "code": error.code,
        "message": str(error),
        "retryable": error.retryable,
        "safeToRetry": error.safe_to_retry,
        **({"actionRequired": error.action_required} if error.action_required else {}),
    }
    return envelope(tool, "unknown" if not error.safe_to_retry and error.retryable else "failed", errors=[detail])


class Client:
    def __init__(self, env: dict[str, str] | None = None) -> None:
        values = env or os.environ
        self.base = values.get("YANGGEDIANZHANG_API_BASE", "").rstrip("/")
        self.tenant = values.get("YANGGEDIANZHANG_TENANT_ID", "").strip()
        self.token = values.get("YANGGEDIANZHANG_HERMES_TOOL_TOKEN", "").strip()
        if not self.base or not self.tenant or not self.token or any(ord(char) < 32 for char in self.token):
            raise ToolFailure(
                "RUNTIME_NOT_CONFIGURED",
                "Etsy Agent 工具运行时未完整注入 API 地址、租户或工具令牌",
            )

    def post(self, path: str, body: dict[str, Any], timeout: int = 45) -> tuple[int, dict[str, Any]]:
        payload = {**body, "tenantId": self.tenant}
        config_read, config_write = os.pipe()
        escaped_token = self.token.replace("\\", "\\\\").replace('"', '\\"')
        os.write(
            config_write,
            (
                f'header = "Authorization: Bearer {escaped_token}"\n'
                'header = "Content-Type: application/json"\n'
            ).encode(),
        )
        os.close(config_write)
        try:
            process = subprocess.run(
                [
                    "curl",
                    "--config",
                    f"/dev/fd/{config_read}",
                    "-sS",
                    "--max-time",
                    str(timeout),
                    "-X",
                    "POST",
                    f"{self.base}{path}",
                    "--data-binary",
                    "@-",
                    "--write-out",
                    "\n%{http_code}",
                ],
                input=json.dumps(payload, ensure_ascii=False),
                text=True,
                capture_output=True,
                check=False,
                pass_fds=(config_read,),
            )
        finally:
            os.close(config_read)
        if process.returncode != 0:
            raise ToolFailure(
                "TRANSPORT_ERROR",
                process.stderr.strip() or f"curl exited {process.returncode}",
                retryable=True,
                safe_to_retry=True,
            )
        raw, separator, status_text = process.stdout.rpartition("\n")
        if not separator or not status_text.isdigit():
            raise ToolFailure("NON_JSON_RESPONSE", "后端响应缺少可验证的 HTTP 状态", retryable=True, safe_to_retry=True)
        try:
            result = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ToolFailure("NON_JSON_RESPONSE", "后端返回的不是 JSON", retryable=True, safe_to_retry=True) from exc
        if not isinstance(result, dict):
            raise ToolFailure("INVALID_RESPONSE", "后端 JSON 不是对象", retryable=True, safe_to_retry=True)
        return int(status_text), result


def require_input(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ToolFailure("INVALID_INPUT", "工具输入必须是 JSON 对象")
    forbidden: set[str] = set()
    pending = [value]
    while pending:
        current = pending.pop()
        if isinstance(current, dict):
            forbidden.update(RUNTIME_FIELDS.intersection(current))
            pending.extend(current.values())
        elif isinstance(current, list):
            pending.extend(current)
    if forbidden:
        raise ToolFailure(
            "RUNTIME_FIELD_FORBIDDEN",
            f"Agent 输入不得包含运行时字段：{', '.join(sorted(forbidden))}",
        )
    return value


def require_keys(data: dict[str, Any], allowed: set[str], required: set[str] | None = None) -> None:
    extra = sorted(set(data) - allowed)
    missing = sorted(key for key in (required or set()) if key not in data)
    if extra or missing:
        details = []
        if extra:
            details.append(f"不支持字段：{', '.join(extra)}")
        if missing:
            details.append(f"缺少字段：{', '.join(missing)}")
        raise ToolFailure("INVALID_INPUT", "；".join(details))


def raise_http(status: int, body: dict[str, Any], *, mutation: bool = False) -> None:
    code = str(body.get("code") or body.get("error") or f"HTTP_{status}")
    message = str(body.get("message") or body.get("userMessage") or code)
    retryable = status >= 500 or status in {408, 429}
    raise ToolFailure(
        code,
        message,
        retryable=retryable,
        safe_to_retry=retryable and not mutation,
        action_required="verify_status_only" if mutation and retryable else None,
    )


def poll(
    client: Client,
    path: str,
    identifier_name: str,
    identifier: str,
    *,
    deadline_seconds: int,
) -> dict[str, Any]:
    deadline = time.monotonic() + deadline_seconds
    while True:
        status, body = client.post(path, {identifier_name: identifier})
        if status != 202:
            if status >= 400 or body.get("ok") is False:
                raise_http(status, body)
            return body
        if time.monotonic() >= deadline:
            raise ToolFailure("POLL_TIMEOUT", "读取仍未得到终态", retryable=True, safe_to_retry=True)
        retry_ms = body.get("retryAfterMs", 2000)
        delay = min(10.0, max(0.25, float(retry_ms) / 1000 if isinstance(retry_ms, (int, float)) else 2.0))
        time.sleep(delay)


def listing_ids(urls: Any) -> list[str]:
    if not isinstance(urls, list):
        raise ToolFailure("INVALID_INPUT", "seller_admin single/batch 需要 urls")
    ids: list[str] = []
    for value in urls:
        match = re.search(r"/listing(?:-editor/edit)?/(\d+)", str(value))
        if not match:
            raise ToolFailure("INVALID_INPUT", "seller_admin URL 中缺少数字 Listing ID")
        ids.append(match.group(1))
    return ids


def accept_cached_within_ms(data: dict[str, Any]) -> dict[str, Any]:
    """把「这次问题能接受多旧的数据」透传给后端。

    缺省不传 = 后端照常真的去读，行为与本次改动前完全一致。之所以由**调用方**声明而不是让后端
    定一个默认窗口：listing 是平台的快照，「这个 listing 现在什么价」和「我上次给它写的标题是啥」
    对新鲜度的要求差着数量级，只有发起这次调用的人知道是哪一种。

    只对 single/batch 生效（shop 是枚举，缓存里有哪几条取决于历史读过什么，证明不了「这就是全店」）；
    后端也在解析层再挡一次，两边一致。
    """
    raw = data.get("acceptCachedWithinMs")
    if raw is None:
        return {}
    if not isinstance(raw, (int, float)) or isinstance(raw, bool) or raw <= 0:
        raise ToolFailure("INVALID_INPUT", "acceptCachedWithinMs 必须是正数（毫秒）")
    return {"acceptCachedWithinMs": int(raw)}


def run_listings(client: Client, data: dict[str, Any]) -> dict[str, Any]:
    require_keys(
        data,
        {"scope", "fields", "urls", "shopUrl", "maxItems", "acceptCachedWithinMs"},
        {"scope", "fields"},
    )
    scope = data.get("scope")
    fields = data.get("fields")
    if scope not in {"single", "batch", "shop"} or fields not in {"public", "seller_admin"}:
        raise ToolFailure("INVALID_INPUT", "scope 或 fields 无效")
    if fields == "public":
        body = {"scope": scope, "fields": "public"}
        for key in ("urls", "shopUrl", "maxItems"):
            if key in data:
                body[key] = data[key]
        if scope != "shop":
            body.update(accept_cached_within_ms(data))
        status, started = client.post("/api/hermes/etsy/tools/listings/get", body)
        if status >= 400:
            raise_http(status, started)
        final = started
        if status == 202:
            request_id = started.get("requestId")
            if not isinstance(request_id, str) or not request_id:
                raise ToolFailure("INVALID_RESPONSE", "公开 Listing start 缺 requestId", retryable=True, safe_to_retry=True)
            final = poll(
                client,
                "/api/hermes/etsy/tools/listings/get/result",
                "requestId",
                request_id,
                deadline_seconds=320,
            )
    else:
        facade_body = {"scope": scope, "fields": "seller_admin"}
        if scope == "shop":
            facade_body["maxItems"] = data.get("maxItems", 10)
        else:
            listing_ids(data.get("urls"))
            facade_body["urls"] = data["urls"]
            facade_body.update(accept_cached_within_ms(data))
        status, started = client.post("/api/hermes/etsy/tools/listings/get", facade_body)
        if status >= 400:
            raise_http(status, started)
        final = started
        if status == 202:
            request_id = started.get("requestId")
            if not isinstance(request_id, str) or not request_id:
                raise ToolFailure("INVALID_RESPONSE", "后台 Listing start 缺 requestId", retryable=True, safe_to_retry=True)
            final = poll(
                client,
                "/api/hermes/etsy/tools/listings/get/result",
                "requestId",
                request_id,
                deadline_seconds=620,
            )
    results = final.get("results") if isinstance(final.get("results"), list) else []
    errors = final.get("errors") if isinstance(final.get("errors"), list) else []
    partial = bool(errors) or any(
        isinstance(item, dict) and item.get("completeness", {}).get("status") != "complete"
        for item in results
    )
    return envelope(
        "etsy_listings_get",
        "partial" if partial else "complete",
        data={
            "source": fields,
            "scope": scope,
            "requestedCount": final.get("requestedCount", 0),
            "resultCount": final.get("resultCount", len(results)),
            "listings": results,
        },
        errors=[
            {
                "code": str(item.get("code", "LISTING_PARTIAL")),
                "message": str(item.get("message", item.get("code", "Listing 读取不完整"))),
                "retryable": bool(item.get("retryable")),
                "safeToRetry": bool(item.get("retryable")),
            }
            for item in errors
            if isinstance(item, dict)
        ],
        truncated=bool(final.get("truncated")),
    )


def run_messages_get(client: Client, data: dict[str, Any]) -> dict[str, Any]:
    require_keys(data, {"selector", "conversationId", "limit", "cursor"}, {"selector"})
    status, result = client.post("/api/hermes/etsy/tools/customer-messages/get", data)
    if status >= 400 or result.get("ok") is False:
        raise_http(status, result)
    has_more = bool(result.get("hasMore"))
    return envelope(
        "etsy_customer_messages_get",
        "partial" if has_more else "complete",
        data={
            "customerId": result.get("customerId"),
            "conversations": result.get("conversations", []),
        },
        truncated=has_more,
        next_cursor=str(result.get("nextCursor") or ""),
    )


def run_messages_publish(client: Client, data: dict[str, Any]) -> dict[str, Any]:
    require_keys(
        data,
        {"selector", "conversationId", "idempotencyKey", "messageType", "content"},
        {"selector", "idempotencyKey", "messageType", "content"},
    )
    deadline = time.monotonic() + 12 * 60
    while True:
        try:
            status, result = client.post("/api/hermes/etsy/tools/customer-messages/publish", data)
        except ToolFailure as error:
            if error.retryable:
                raise ToolFailure(
                    "RESULT_UNKNOWN",
                    "发布请求的传输结果未知，消息可能已经发出",
                    retryable=True,
                    safe_to_retry=False,
                    action_required="verify_status_only",
                ) from error
            raise
        if status >= 400 or result.get("ok") is False:
            raise_http(status, result, mutation=True)
        job = result.get("job")
        if not isinstance(job, dict):
            raise ToolFailure(
                "INVALID_RESPONSE",
                "发布响应缺 job",
                retryable=True,
                safe_to_retry=False,
                action_required="verify_status_only",
            )
        job_status = job.get("status")
        if job_status == "sent" and job.get("externalMessageId") and job.get("platformSentAt"):
            return envelope(
                "etsy_customer_messages_publish",
                "complete",
                data={
                    "status": "sent",
                    "externalMessageId": job["externalMessageId"],
                    "platformSentAt": job["platformSentAt"],
                },
            )
        if job_status in {"failed", "expired"}:
            return envelope(
                "etsy_customer_messages_publish",
                "failed",
                data={"status": job_status},
                errors=[{
                    "code": f"PUBLISH_{str(job_status).upper()}",
                    "message": str(job.get("note") or job_status),
                    "retryable": False,
                    "safeToRetry": False,
                }],
            )
        if job_status == "result_unknown":
            return envelope(
                "etsy_customer_messages_publish",
                "unknown",
                data={"status": "result_unknown"},
                errors=[{
                    "code": "RESULT_UNKNOWN",
                    "message": str(job.get("note") or "发送结果未知，可能已经发出"),
                    "retryable": True,
                    "safeToRetry": False,
                    "actionRequired": "verify_status_only",
                }],
            )
        if job_status not in {"queued", "dispatched"}:
            raise ToolFailure(
                "INVALID_RESPONSE",
                f"未知发布状态：{job_status}",
                retryable=True,
                safe_to_retry=False,
                action_required="verify_status_only",
            )
        if time.monotonic() >= deadline:
            raise ToolFailure(
                "RESULT_UNKNOWN",
                "发布在等待窗口内未得到可证明终态",
                retryable=True,
                safe_to_retry=False,
                action_required="verify_status_only",
            )
        time.sleep(2)


def run_orders(client: Client, data: dict[str, Any]) -> dict[str, Any]:
    # requireLive：这次必须现场去 Etsy 看，绕开店铺账本。不放行的话，按单号问完整收货地址
    # 永远拿不到——账本拦下所有小规模点查，而完整地址按隐私规则不进 Base。
    require_keys(data, {"orderNumbers", "scope", "cursor", "requireLive"})
    status, started = client.post("/api/hermes/etsy/tools/orders/get", data)
    if status >= 400:
        raise_http(status, started)
    if status != 202:
        if started.get("schemaVersion") == SCHEMA_VERSION:
            return started
        raise ToolFailure("INVALID_RESPONSE", "订单 start 未返回 pending", retryable=True, safe_to_retry=True)
    operation_id = started.get("operationId")
    if not isinstance(operation_id, str) or not operation_id:
        raise ToolFailure("INVALID_RESPONSE", "订单 start 缺 operationId", retryable=True, safe_to_retry=True)
    final = poll(
        client,
        "/api/hermes/etsy/tools/orders/get/result",
        "operationId",
        operation_id,
        deadline_seconds=620,
    )
    if final.get("schemaVersion") != SCHEMA_VERSION or final.get("tool") != "get_etsy_orders":
        raise ToolFailure("INVALID_RESPONSE", "订单终态不符合 Agent 契约", retryable=True, safe_to_retry=True)
    return final


def validate_final(tool: str, result: dict[str, Any]) -> dict[str, Any]:
    if result.get("schemaVersion") != SCHEMA_VERSION or result.get("tool") != tool:
        raise ToolFailure("INVALID_RESPONSE", "统计终态不符合 Agent 契约", retryable=True, safe_to_retry=True)
    pending: list[Any] = [result]
    while pending:
        current = pending.pop()
        if isinstance(current, dict):
            forbidden = RUNTIME_FIELDS.intersection(current)
            if forbidden:
                raise ToolFailure(
                    "INVALID_RESPONSE",
                    f"统计终态包含内部字段：{', '.join(sorted(forbidden))}",
                    retryable=True,
                    safe_to_retry=True,
                )
            pending.extend(current.values())
        elif isinstance(current, list):
            pending.extend(current)
    return result


def run_stats_get(client: Client, data: dict[str, Any]) -> dict[str, Any]:
    require_keys(data, {
        "from", "to", "granularity", "dimensions", "listingIds", "metrics", "limit", "cursor",
    })
    status, result = client.post("/api/hermes/etsy/tools/stats/get", data)
    if status >= 400 or result.get("ok") is False and result.get("schemaVersion") != SCHEMA_VERSION:
        raise_http(status, result)
    return validate_final("get_etsy_stats", result)


def run_stats_describe(client: Client, data: dict[str, Any]) -> dict[str, Any]:
    require_keys(data, {"sections", "dimensions", "limit", "cursor"})
    status, result = client.post("/api/hermes/etsy/tools/stats/describe", data)
    if status >= 400 or result.get("ok") is False and result.get("schemaVersion") != SCHEMA_VERSION:
        raise_http(status, result)
    return validate_final("describe_etsy_stats", result)


def run_stats_summarize(client: Client, data: dict[str, Any]) -> dict[str, Any]:
    require_keys(data, {
        "from", "to", "dimension", "metrics", "groupBy", "listingIds", "subjectKeys",
        "compare", "sort", "limit", "cursor",
    }, {"dimension", "metrics"})
    status, result = client.post("/api/hermes/etsy/tools/stats/summarize", data)
    if status >= 400 or result.get("ok") is False and result.get("schemaVersion") != SCHEMA_VERSION:
        raise_http(status, result)
    return validate_final("summarize_etsy_stats", result)

def run_ads_get(client: Client, data: dict[str, Any]) -> dict[str, Any]:
    require_keys(data, {"from", "to", "sections", "listingIds"}, {"from", "to"})
    status, result = client.post("/api/hermes/etsy/tools/ads/get", data)
    if status >= 400 or result.get("ok") is False and result.get("schemaVersion") != SCHEMA_VERSION:
        raise_http(status, result)
    return validate_final("get_etsy_ads", result)


def execute(tool: str, value: Any, client: Client | None = None) -> dict[str, Any]:
    if tool not in TOOLS:
        raise ToolFailure("UNKNOWN_TOOL", f"未知工具：{tool}")
    data = require_input(value)
    runtime = client or Client()
    if tool == "etsy_listings_get":
        return run_listings(runtime, data)
    if tool == "etsy_customer_messages_get":
        return run_messages_get(runtime, data)
    if tool == "etsy_customer_messages_publish":
        return run_messages_publish(runtime, data)
    if tool == "get_etsy_orders":
        return run_orders(runtime, data)
    if tool == "get_etsy_stats":
        return run_stats_get(runtime, data)
    if tool == "describe_etsy_stats":
        return run_stats_describe(runtime, data)
    if tool == "summarize_etsy_stats":
        return run_stats_summarize(runtime, data)
    if tool == "get_etsy_ads":
        return run_ads_get(runtime, data)
    raise ToolFailure("UNKNOWN_TOOL", f"未知工具：{tool}")


def main(argv: list[str]) -> int:
    invoked_as = Path(argv[0]).name if argv else ""
    tool = invoked_as if invoked_as in TOOLS else argv[1] if len(argv) == 2 else ""
    if not tool:
        print(json.dumps(failed_envelope("get_etsy_orders", ToolFailure("USAGE", "需要且只需要一个工具名")), ensure_ascii=False))
        return 2
    try:
        value = json.load(sys.stdin)
        result = execute(tool, value)
        print(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
        return 0 if result.get("ok") else 1
    except ToolFailure as error:
        print(json.dumps(failed_envelope(tool if tool in TOOLS else "get_etsy_orders", error), ensure_ascii=False, separators=(",", ":")))
        return 1
    except (json.JSONDecodeError, OSError) as error:
        failure = ToolFailure("INVALID_INPUT", str(error))
        print(json.dumps(failed_envelope(tool if tool in TOOLS else "get_etsy_orders", failure), ensure_ascii=False, separators=(",", ":")))
        return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
