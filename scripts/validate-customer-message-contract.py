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
        # v1.0.22：发布支持图片附件（imageAssetUrls），但纯图片、无文字仍不支持——
        # 契约必须同时讲清「怎么带图」和「不能只发图」。
        "imageAssetUrls",
        "纯图片、无文字的消息不支持",
        "expectedBuyerName",
        # v1.0.23：发送前的店主确认卡（主仓 v0.6.49.0）。这是发送链路唯一的人工闸——
        # 契约里少讲一条，agent 就会把「已送确认卡」汇报成「已发送」，或者换个键再提交一次。
        "awaiting_confirmation",
        "确认发送",
        "cardDelivered",
        "PUBLISH_CONFIRMATION_PENDING_EXISTS",
        "PUBLISH_CONFIRMATION_CHAT_MISSING",
        "cancelled",
        # v1.0.25：首次主动联系（主仓 v0.6.51.0）。买家没发过消息、直接下单时 Etsy 上根本没有
        # 会话，契约必须讲清「不传 conversationId + 按订单号」这条配方，以及不要为已有会话的
        # 买家另开一条平行会话——少讲一条，agent 就会把「拿不到 conversationId」当成发不了。
        "CUSTOMER_CONVERSATION_ALREADY_EXISTS",
        "整个不传 `conversationId`",
        "第一次主动联系只能发纯文字",
    )
    failures += require(
        "orders-customers/SKILL.md",
        "references/etsy-message-tools.md",
        "店主确认卡",
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
