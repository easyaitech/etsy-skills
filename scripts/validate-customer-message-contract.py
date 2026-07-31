#!/usr/bin/env python3
"""Validate the LLM-facing Etsy customer message tool contract."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OLD_FILES = (
    "orders-customers/references/etsy-reply-draft-tool.md",
    "orders-customers/references/etsy-order-message-tool.md",
)
OLD_ENDPOINTS = (
    "/api/hermes/etsy-dm/conversations",
    "/api/hermes/etsy-dm/reply-draft",
    "/api/hermes/etsy-dm/order-message",
    "/api/etsy-dm/draft",
)


def require(path: str, *needles: str) -> list[str]:
    target = ROOT / path
    if not target.is_file():
        return [f"{path}: missing"]
    text = target.read_text(encoding="utf-8")
    return [f"{path}: missing {needle!r}" for needle in needles if needle not in text]


def active_markdown_files() -> list[Path]:
    skip_parts = {".git", ".codex", ".gstack", ".claude", "node_modules"}
    return sorted(
        path
        for path in ROOT.rglob("*.md")
        if not any(part in skip_parts for part in path.relative_to(ROOT).parts)
        and path.name != "CHANGELOG.md"
    )


def main() -> int:
    failures: list[str] = []
    failures += require(
        "orders-customers/references/etsy-message-tools.md",
        "etsy_customer_messages_get",
        "etsy_customer_messages_publish",
        '"type":"customer_id"',
        '"type":"order_number"',
        '"type":"tracking_number"',
        # 后端 >= v0.6.20.0 / v0.6.21.6 的三件能力，缺一条就是把文档改回过去时：
        # 第 4 种 selector、潜在客户合成身份（读+发）、不指名道姓的最近来往列表。
        '"type":"platform_customer_id"',
        "etsy-buyer:",
        'CUSTOMER_SELECTOR_NOT_FOUND',
        'CUSTOMER_CONVERSATION_NOT_FOUND',
        '"scope":"recent"',
        "totalConversationCount",
        "isProspect=true",
        "platformDisplayName",
        "messageCount",
        "direction=inbound",
        "direction=outbound",
        "sentAt",
        "messageType",
        "text",
        "4000",
        "idempotencyKey",
        "job.status=sent",
        "job.externalMessageId",
        "job.platformSentAt",
        "result_unknown",
        "safeToRetry=false",
        "verify_status_only",
        "每个会话最多保留最近 100 条",
        "每个租户最多保留最近",
        "5000 条",
        "不支持图片或附件",
    )
    failures += require(
        "orders-customers/SKILL.md",
        "references/etsy-message-tools.md",
        "调正式获取工具读取该 customer 的双向消息",
        "调正式发布工具",
        "get_etsy_orders",
        "订单号或快递单号",
        "result_unknown",
    )
    failures += require(
        "orders-customers/references/platforms/etsy.md",
        "../etsy-message-tools.md",
        "正式消息工具 V1",
        "只支持文字",
    )
    failures += require(
        "shared/backend-api-access.md",
        "../orders-customers/references/etsy-message-tools.md",
    )
    failures += require(
        "shared/tools-architecture.md",
        "Etsy 客户消息",
        "/api/hermes/etsy/tools/customer-messages/get",
        "/api/hermes/etsy/tools/customer-messages/publish",
        "幂等真实发送任务",
        "旧会话查询、草稿与订单发送路径已退役",
    )

    for relative in OLD_FILES:
        if (ROOT / relative).exists():
            failures.append(f"{relative}: retired file must not exist")

    for source in active_markdown_files():
        text = source.read_text(encoding="utf-8")
        for endpoint in OLD_ENDPOINTS:
            if endpoint in text:
                failures.append(f"{source.relative_to(ROOT)}: contains retired endpoint {endpoint}")

    if failures:
        print("customer-message-contract: FAIL", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1
    print("customer-message-contract: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
