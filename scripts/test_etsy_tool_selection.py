#!/usr/bin/env python3
"""Validate the Agent tool-selection acceptance matrix.

This does not pretend to emulate an LLM. It keeps a reviewable set of natural-language
requests and enforces that every expected answer is one of the eleven published tools and
never a retired tool. The >=95% runtime selection score is collected during Agent canary.
"""

from __future__ import annotations

import unittest
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FORMAL_TOOLS = set(json.loads((ROOT / "etsy-stack.json").read_text(encoding="utf-8"))["agentTools"])

RETIRED_TOOLS = {
    "etsy_listing_public_read",
    "etsy_listing_admin_read",
    "etsy_dm_conversations",
    "etsy_dm_reply_draft",
    "etsy_order_message",
}

CASES = [
    ("看看这个 Etsy listing 的公开标题和价格", "etsy_listings_get"),
    ("批量读取这十个 Etsy 商品链接", "etsy_listings_get"),
    ("读取我店铺后台这个 listing 的完整配置", "etsy_listings_get"),
    ("把 Etsy 店铺里的 listing 列出来", "etsy_listings_get"),
    ("查这位 Etsy 客户最近的双向消息", "etsy_customer_messages_get"),
    ("按订单号找到买家并读取聊天记录", "etsy_customer_messages_get"),
    ("按快递单号查对应客户消息", "etsy_customer_messages_get"),
    ("继续读取这段 Etsy 会话的下一页", "etsy_customer_messages_get"),
    ("把这段已确认文字真实发送给 Etsy 客户", "etsy_customer_messages_publish"),
    ("按这个稳定幂等键发布客户回复", "etsy_customer_messages_publish"),
    ("核验刚才那条 Etsy 消息是否真的发出", "etsy_customer_messages_publish"),
    ("发送这条纯文字售后回复，不要附件", "etsy_customer_messages_publish"),
    ("获取订单 1234567890 的详细信息", "get_etsy_orders"),
    ("查这几个 Etsy 订单号现在的状态", "get_etsy_orders"),
    ("列出所有未送达订单", "get_etsy_orders"),
    ("列出已经送达的订单", "get_etsy_orders"),
    ("同时扫描 active 和 delivered 订单", "get_etsy_orders"),
    ("继续读取上一页订单结果", "get_etsy_orders"),
    ("这张已经发货但运输中的订单详情是什么", "get_etsy_orders"),
    ("订单在 New 还是 Completed 不清楚，帮我查到它", "get_etsy_orders"),
    ("读取 New 和 Completed 并按订单号去重", "get_etsy_orders"),
    ("查订单履约、配送和页面归属三个状态", "get_etsy_orders"),
    ("这个订单是否已经 delivered", "get_etsy_orders"),
    ("查询 active 订单的下一页", "get_etsy_orders"),
    ("我不知道数据库里有哪些 Etsy Stats 指标，先列出来", "describe_etsy_stats"),
    ("现在有哪几天和哪些 Listing 的 Stats 数据", "describe_etsy_stats"),
    ("现有 Stats 数据是否包含独立 Etsy Ads 后台", "describe_etsy_stats"),
    ("分析最近七天 Etsy 店铺访问和订单趋势", "summarize_etsy_stats"),
    ("比较这些 Listing 每天的流量表现", "summarize_etsy_stats"),
    ("哪些 Etsy 流量来源带来的访问最多", "summarize_etsy_stats"),
    ("比较这个月和上个月 Listing views", "summarize_etsy_stats"),
    ("读取 Etsy 搜索词和外部网站来源统计", "get_etsy_stats"),
    ("继续读取上一页 Etsy Stats 查询结果", "get_etsy_stats"),
    ("读取昨天 Etsy Ads 的展示、点击、花费和 ROAS", "get_etsy_ads"),
    ("比较各个广告 Listing 最近一周的表现", "get_etsy_ads"),
    ("广告归因订单和当前每日预算是多少", "get_etsy_ads"),
    ("查一下订单 1234567890 的 SOP 做到哪一步", "etsy_order_sop_get"),
    ("把这单的打包步骤标记成已完成", "etsy_order_sop_update"),
    ("提议把 SOP 的质检步骤移到打包前", "etsy_order_sop_propose_flow_change"),
]


class ToolSelectionMatrixTest(unittest.TestCase):
    def test_matrix_has_at_least_twenty_cases_and_only_formal_tools(self) -> None:
        self.assertGreaterEqual(len(CASES), 20)
        expected = {tool for _, tool in CASES}
        self.assertTrue(expected.issubset(FORMAL_TOOLS))
        self.assertTrue(expected.isdisjoint(RETIRED_TOOLS))
        self.assertEqual(expected, FORMAL_TOOLS)

    def test_each_case_is_unique_and_reviewable(self) -> None:
        prompts = [prompt for prompt, _ in CASES]
        self.assertEqual(len(prompts), len(set(prompts)))
        self.assertTrue(all(len(prompt.strip()) >= 8 for prompt in prompts))

    def test_ecommerce_stack_delegates_formal_tool_validation_to_adapter(self) -> None:
        script = Path(__file__).with_name("etsy-stack").read_text(encoding="utf-8")
        self.assertIn('exec "$INSTALL_DIR/scripts/etsy_agent_tool.py" "$tool_name"', script)
        self.assertNotIn("etsy_listings_get|etsy_customer_messages_get", script)
        self.assertNotIn("eval ", script)


if __name__ == "__main__":
    unittest.main()
