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
        "/api/hermes/etsy/messages/get",
        "/api/hermes/etsy/messages/publish",
        "customerId",
        "orderNumber",
        "trackingNumber",
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
