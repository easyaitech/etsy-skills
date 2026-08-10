#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import subprocess
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

MODULE_PATH = Path(__file__).with_name("etsy_agent_tool.py")
SPEC = importlib.util.spec_from_file_location("etsy_agent_tool", MODULE_PATH)
assert SPEC and SPEC.loader
tool = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(tool)


class FakeClient:
    def __init__(self, replies):
        self.replies = list(replies)
        self.calls = []

    def post(self, path, body, timeout=45):
        self.calls.append((path, body, timeout))
        return self.replies.pop(0)


class ListingCacheDeclarationTest(unittest.TestCase):
    """「能接受多旧」由调用方声明，缺省不传 —— 默认行为必须一个字不变。"""

    def _final(self):
        return {"ok": True, "results": [], "errors": []}

    def test_seller_admin_forwards_the_declaration(self):
        client = FakeClient([(200, self._final())])
        tool.run_listings(client, {
            "scope": "single",
            "fields": "seller_admin",
            "urls": ["https://www.etsy.com/listing/123/x"],
            "acceptCachedWithinMs": 600000,
        })
        _, body, _ = client.calls[0]
        self.assertEqual(body["acceptCachedWithinMs"], 600000)

    def test_public_forwards_the_declaration(self):
        client = FakeClient([(200, self._final())])
        tool.run_listings(client, {
            "scope": "batch",
            "fields": "public",
            "urls": ["https://www.etsy.com/listing/123/x"],
            "acceptCachedWithinMs": 300000,
        })
        _, body, _ = client.calls[0]
        self.assertEqual(body["acceptCachedWithinMs"], 300000)

    def test_absent_declaration_is_not_sent(self):
        # 缺省 = 后端照常真的去读；多发一个字段都可能被后端的封闭字段集拒掉。
        client = FakeClient([(200, self._final())])
        tool.run_listings(client, {
            "scope": "single",
            "fields": "seller_admin",
            "urls": ["https://www.etsy.com/listing/123/x"],
        })
        _, body, _ = client.calls[0]
        self.assertNotIn("acceptCachedWithinMs", body)

    def test_shop_scope_never_forwards_it(self):
        # shop 是枚举：缓存里有哪几条取决于历史读过什么，证明不了「这就是全店」。
        client = FakeClient([(200, self._final())])
        tool.run_listings(client, {
            "scope": "shop",
            "fields": "seller_admin",
            "maxItems": 5,
            "acceptCachedWithinMs": 600000,
        })
        _, body, _ = client.calls[0]
        self.assertNotIn("acceptCachedWithinMs", body)

    def test_rejects_a_nonsense_window(self):
        for bad in (0, -1, "600000", True):
            with self.assertRaises(tool.ToolFailure):
                tool.accept_cached_within_ms({"acceptCachedWithinMs": bad})


class EtsyAgentToolTest(unittest.TestCase):
    def test_install_and_cli_smoke_cover_all_stats_and_ads_commands(self):
        root = MODULE_PATH.parent.parent
        install = (root / "install.sh").read_text(encoding="utf-8")
        for name in ("get_etsy_stats", "describe_etsy_stats", "summarize_etsy_stats", "get_etsy_ads"):
            self.assertIn(name, install)
            completed = subprocess.run(
                ["python3", str(MODULE_PATH), name],
                input="{}",
                text=True,
                capture_output=True,
                env={
                    "PATH": "/usr/bin:/bin",
                    "YANGGEDIANZHANG_API_BASE": "",
                    "YANGGEDIANZHANG_TENANT_ID": "",
                    "YANGGEDIANZHANG_HERMES_TOOL_TOKEN": "",
                },
                check=False,
            )
            self.assertEqual(completed.returncode, 1)
            payload = __import__("json").loads(completed.stdout)
            self.assertEqual(payload["tool"], name)
            self.assertEqual(payload["schemaVersion"], "etsy-agent-tool/v1")

    def test_transport_does_not_put_token_in_process_arguments(self):
        client = tool.Client({
            "YANGGEDIANZHANG_API_BASE": "https://bridge.test",
            "YANGGEDIANZHANG_TENANT_ID": "tenant-a",
            "YANGGEDIANZHANG_HERMES_TOOL_TOKEN": "super-secret-token",
        })
        completed = subprocess.CompletedProcess([], 0, '{"ok":true}\n200', "")
        with patch.object(tool.subprocess, "run", return_value=completed) as run:
            status, body = client.post("/test", {"value": 1})
        self.assertEqual((status, body), (200, {"ok": True}))
        args = run.call_args.args[0]
        self.assertNotIn("super-secret-token", str(args))
        self.assertNotIn("super-secret-token", run.call_args.kwargs["input"])
        self.assertTrue(run.call_args.kwargs["pass_fds"])

    def test_rejects_runtime_fields(self):
        with self.assertRaisesRegex(tool.ToolFailure, "Agent 输入不得包含"):
            tool.execute("get_etsy_orders", {"tenantId": "forbidden", "orderNumbers": ["123456"]})

    def test_rejects_unknown_and_missing_agent_fields_before_transport(self):
        client = FakeClient([])
        with self.assertRaisesRegex(tool.ToolFailure, "不支持字段"):
            tool.execute("etsy_customer_messages_get", {
                "selector": {"type": "order_number", "value": "123456"},
                "debug": True,
            }, client)
        with self.assertRaisesRegex(tool.ToolFailure, "缺少字段"):
            tool.execute("etsy_customer_messages_publish", {
                "selector": {"type": "customer_id", "value": "C-1"},
                "messageType": "text",
                "content": "hello",
            }, client)
        self.assertEqual(client.calls, [])

    def test_orders_hides_polling_identifier_and_preserves_partial(self):
        client = FakeClient([
            (202, {"ok": True, "operationId": "internal", "retryAfterMs": 250}),
            (202, {"ok": True, "status": "pending", "retryAfterMs": 250}),
            (200, {
                "schemaVersion": "etsy-agent-tool/v1",
                "tool": "get_etsy_orders",
                "ok": True,
                "outcome": "partial",
                "data": {"orders": [], "notFound": False},
                "completeness": {"status": "partial", "truncated": False},
                "errors": [],
            }),
        ])
        with patch.object(tool.time, "sleep"):
            result = tool.execute("get_etsy_orders", {"orderNumbers": ["123456"]}, client)
        self.assertEqual(result["outcome"], "partial")
        self.assertNotIn("internal", str(result))
        self.assertEqual(client.calls[0][0], "/api/hermes/etsy/tools/orders/get")
        self.assertEqual(client.calls[1][0], "/api/hermes/etsy/tools/orders/get/result")
        self.assertEqual(client.calls[1][1], {"operationId": "internal"})

    def test_orders_passes_require_live_through(self):
        """requireLive 是「这次必须现场去 Etsy 看」。包装层挡掉它的话，按单号问完整收货地址
        就永远拿不到——账本拦下所有小规模点查，而完整地址按隐私规则不进 Base。"""
        client = FakeClient([(200, {
            "schemaVersion": "etsy-agent-tool/v1",
            "tool": "get_etsy_orders",
            "ok": True,
            "outcome": "complete",
            "data": {"orders": [], "notFound": False},
            "completeness": {"status": "complete", "truncated": False},
            "errors": [],
        })])
        tool.execute("get_etsy_orders", {"orderNumbers": ["123456"], "requireLive": True}, client)
        self.assertEqual(client.calls[0][1], {"orderNumbers": ["123456"], "requireLive": True})

    def test_orders_preserves_business_scope_and_opaque_cursor(self):
        client = FakeClient([(200, {
            "schemaVersion": "etsy-agent-tool/v1",
            "tool": "get_etsy_orders",
            "ok": True,
            "outcome": "partial",
            "data": {"orders": [], "missingOrderNumbers": [], "notFound": False},
            "completeness": {
                "status": "partial",
                "truncated": True,
                "nextCursor": "eor1_opaque",
            },
            "errors": [],
        })])
        result = tool.execute("get_etsy_orders", {
            "scope": "active",
            "cursor": "eor1_previous",
        }, client)
        self.assertEqual(client.calls[0][1], {
            "scope": "active",
            "cursor": "eor1_previous",
        })
        self.assertEqual(result["completeness"]["nextCursor"], "eor1_opaque")

    def test_stats_is_sync_and_preserves_partial_gaps_and_cursor(self):
        final = {
            "schemaVersion": "etsy-agent-tool/v1",
            "tool": "get_etsy_stats",
            "ok": True,
            "outcome": "partial",
            "data": {"rows": [], "gaps": [{"period": "2026-07-01", "dimension": "listing"}]},
            "completeness": {"status": "partial", "truncated": True, "nextCursor": "esq1_opaque"},
            "errors": [{"code": "STATS_COVERAGE_PARTIAL", "message": "partial", "retryable": True, "safeToRetry": True}],
        }
        client = FakeClient([(200, final)])
        result = tool.execute("get_etsy_stats", {
            "from": "2026-07-01",
            "to": "2026-07-07",
            "dimensions": ["listing", "traffic_source"],
            "cursor": "esq1_previous",
        }, client)
        self.assertEqual(result, final)
        self.assertEqual(client.calls, [(
            "/api/hermes/etsy/tools/stats/get",
            {
                "from": "2026-07-01",
                "to": "2026-07-07",
                "dimensions": ["listing", "traffic_source"],
                "cursor": "esq1_previous",
            },
            45,
        )])

    def test_stats_rejects_nested_runtime_fields_before_transport(self):
        client = FakeClient([])
        with self.assertRaises(tool.ToolFailure) as raised:
            tool.execute("get_etsy_stats", {
                "dimensions": [{"tenantId": "tenant-b"}],
            }, client)
        self.assertEqual(raised.exception.code, "RUNTIME_FIELD_FORBIDDEN")
        self.assertEqual(client.calls, [])

    def test_describe_stats_has_an_explicit_path_and_whitelist(self):
        final = {
            "schemaVersion": "etsy-agent-tool/v1",
            "tool": "describe_etsy_stats",
            "ok": True,
            "outcome": "complete",
            "data": {"dimensions": ["listing"], "excludedSources": ["etsy_ads_backend"]},
            "completeness": {"status": "complete", "truncated": False},
            "errors": [],
        }
        client = FakeClient([(200, final)])
        result = tool.execute("describe_etsy_stats", {
            "sections": ["dimensions", "metrics"],
            "limit": 20,
        }, client)
        self.assertEqual(result, final)
        self.assertEqual(client.calls[0][0], "/api/hermes/etsy/tools/stats/describe")
        with self.assertRaisesRegex(tool.ToolFailure, "不支持字段"):
            tool.execute("describe_etsy_stats", {"from": "2026-07-01"}, FakeClient([]))

    def test_summarize_stats_has_an_explicit_path_required_fields_and_cursor(self):
        final = {
            "schemaVersion": "etsy-agent-tool/v1",
            "tool": "summarize_etsy_stats",
            "ok": True,
            "outcome": "complete",
            "data": {"rows": []},
            "completeness": {"status": "complete", "truncated": True, "nextCursor": "ess1_next"},
            "errors": [],
        }
        client = FakeClient([(200, final)])
        result = tool.execute("summarize_etsy_stats", {
            "dimension": "listing",
            "metrics": [{"key": "views", "aggregation": "sum"}],
            "groupBy": ["listing"],
            "cursor": "ess1_previous",
        }, client)
        self.assertEqual(result["completeness"]["nextCursor"], "ess1_next")
        self.assertEqual(client.calls[0][0], "/api/hermes/etsy/tools/stats/summarize")
        with self.assertRaisesRegex(tool.ToolFailure, "缺少字段"):
            tool.execute("summarize_etsy_stats", {"dimension": "listing"}, FakeClient([]))

    def test_stats_final_tool_name_and_safe_output_are_fail_closed(self):
        wrong = {
            "schemaVersion": "etsy-agent-tool/v1",
            "tool": "get_etsy_stats",
            "ok": True,
            "outcome": "complete",
            "data": {},
            "completeness": {"status": "complete", "truncated": False},
            "errors": [],
        }
        with self.assertRaisesRegex(tool.ToolFailure, "终态不符合"):
            tool.execute("describe_etsy_stats", {}, FakeClient([(200, wrong)]))
        unsafe = {
            **wrong,
            "tool": "summarize_etsy_stats",
            "data": {"nested": {"operationId": "internal"}},
        }
        with self.assertRaisesRegex(tool.ToolFailure, "内部字段"):
            tool.execute("summarize_etsy_stats", {
                "dimension": "listing",
                "metrics": [{"key": "views", "aggregation": "sum"}],
            }, FakeClient([(200, unsafe)]))

    def test_ads_uses_an_explicit_sync_path_and_preserves_time_semantics(self):
        final = {
            "schemaVersion": "etsy-agent-tool/v1",
            "tool": "get_etsy_ads",
            "ok": True,
            "outcome": "complete",
            "data": {
                "source": "etsy_ads_backend",
                "timeSemantics": {
                    "campaign": "daily",
                    "listings": "daily",
                    "attributedOrders": "rolling_30_days_as_observed",
                    "settings": "current_at_capture",
                },
                "snapshots": [],
                "gaps": [],
            },
            "completeness": {"status": "complete", "truncated": False},
            "errors": [],
        }
        client = FakeClient([(200, final)])
        result = tool.execute("get_etsy_ads", {
            "from": "2026-07-26",
            "to": "2026-07-26",
            "sections": ["campaign", "listings", "attributed_orders", "settings"],
            "listingIds": ["4510004567"],
        }, client)
        self.assertEqual(result, final)
        self.assertEqual(client.calls[0][0], "/api/hermes/etsy/tools/ads/get")
        with self.assertRaisesRegex(tool.ToolFailure, "不支持字段"):
            tool.execute("get_etsy_ads", {
                "from": "2026-07-26",
                "to": "2026-07-26",
                "cursor": "not-supported",
            }, FakeClient([]))

    def test_message_get_uses_canonical_selector_and_cursor(self):
        client = FakeClient([(200, {
            "ok": True,
            "customerId": "C-1",
            "conversations": [],
            "hasMore": True,
            "nextCursor": "opaque",
        })])
        result = tool.execute(
            "etsy_customer_messages_get",
            {"selector": {"type": "order_number", "value": "123"}, "limit": 10},
            client,
        )
        self.assertEqual(result["outcome"], "partial")
        self.assertEqual(result["completeness"]["nextCursor"], "opaque")
        self.assertEqual(client.calls[0][0], "/api/hermes/etsy/tools/customer-messages/get")
        self.assertEqual(client.calls[0][1]["selector"], {"type": "order_number", "value": "123"})

    def test_message_get_passes_through_platform_customer_id_selector(self):
        # 第 4 种 selector（后端 >= v0.6.20.0）：包装层不改写、不拦截，data 透传 isProspect 与
        # messageCount——潜在客户的措辞规则（「Etsy 上叫 X 的买家」）全靠这两个字段撑着。
        client = FakeClient([(200, {
            "ok": True,
            "customerId": "etsy-buyer:911046840",
            "isProspect": True,
            "messageCount": 3,
            "conversations": [{"conversationId": "conv-1", "messages": []}],
            "hasMore": False,
        })])
        result = tool.execute(
            "etsy_customer_messages_get",
            {"selector": {"type": "platform_customer_id", "value": "911046840"}},
            client,
        )
        self.assertEqual(result["outcome"], "complete")
        self.assertEqual(
            client.calls[0][1]["selector"],
            {"type": "platform_customer_id", "value": "911046840"},
        )
        self.assertEqual(result["data"]["customerId"], "etsy-buyer:911046840")
        self.assertTrue(result["data"]["isProspect"])
        self.assertEqual(result["data"]["messageCount"], 3)

    def test_message_get_recent_scope_lists_without_selector(self):
        client = FakeClient([(200, {
            "ok": True,
            "scope": "recent",
            "conversationCount": 2,
            "totalConversationCount": 5,
            "conversations": [{"conversationId": "conv-1"}, {"conversationId": "conv-2"}],
            "hasMore": True,
        })])
        result = tool.execute("etsy_customer_messages_get", {"scope": "recent", "limit": 2}, client)
        self.assertEqual(result["outcome"], "partial")
        self.assertTrue(result["completeness"]["truncated"])
        self.assertEqual(client.calls[0][1]["scope"], "recent")
        self.assertNotIn("selector", client.calls[0][1])
        self.assertEqual(result["data"]["scope"], "recent")
        self.assertEqual(result["data"]["conversationCount"], 2)
        self.assertEqual(result["data"]["totalConversationCount"], 5)

    def test_message_get_requires_exactly_one_of_selector_and_recent_scope(self):
        # selector 与 scope 同给 / 都不给 / scope 取别的值，都在包装层就拒，不打到后端猜语义。
        for bad_input in (
            {},
            {"selector": {"type": "customer_id", "value": "C-1"}, "scope": "recent"},
            {"scope": "all"},
        ):
            with self.assertRaisesRegex(tool.ToolFailure, "selector|scope"):
                tool.execute("etsy_customer_messages_get", bad_input, FakeClient([]))

    def test_publish_replays_same_intent_until_proven_sent(self):
        request = {
            "selector": {"type": "customer_id", "value": "C-1"},
            "conversationId": "etsy:70001",
            "expectedBuyerName": "G G",
            "idempotencyKey": "stable",
            "messageType": "text",
            "content": "hello",
        }
        client = FakeClient([
            (201, {"ok": True, "job": {"status": "queued"}}),
            (200, {"ok": True, "job": {
                "status": "sent",
                "externalMessageId": "m-1",
                "platformSentAt": "2026-07-26T00:00:00.000Z",
            }}),
        ])
        with patch.object(tool.time, "sleep"):
            result = tool.execute("etsy_customer_messages_publish", request, client)
        self.assertEqual(result["outcome"], "complete")
        self.assertEqual(client.calls[0][0], "/api/hermes/etsy/tools/customer-messages/publish")
        self.assertEqual(client.calls[0][1], client.calls[1][1])

    def test_publish_passes_image_asset_urls_through_verbatim(self):
        # v1.0.22：imageAssetUrls（站内信图片附件）必须原样透传——两层白名单任何一层
        # 挡掉它，契约就又变成「写了一个用不了的参数」。
        client = FakeClient([
            (201, {"ok": True, "job": {
                "status": "sent",
                "externalMessageId": "m-img",
                "platformSentAt": "2026-08-10T00:00:00.000Z",
            }}),
        ])
        image_urls = ["https://app.example.com/api/feishu/message-assets/tenant-a_0f.jpg?expiresAt=x&sig=y"]
        result = tool.execute("etsy_customer_messages_publish", {
            "selector": {"type": "customer_id", "value": "C-1"},
            "conversationId": "etsy:70001",
            "expectedBuyerName": "G G",
            "idempotencyKey": "stable-img",
            "messageType": "text",
            "content": "photos attached",
            "imageAssetUrls": image_urls,
        }, client)
        self.assertEqual(result["outcome"], "complete")
        self.assertEqual(client.calls[0][1]["imageAssetUrls"], image_urls)

    def test_publish_requires_recipient_evidence_fields(self):
        # 后端 v2 硬要求 conversationId + expectedBuyerName；包装层就地拒绝并点名字段，
        # 不让缺证据的请求打到后端再猜语义。
        client = FakeClient([])
        with self.assertRaisesRegex(tool.ToolFailure, "缺少字段.*(conversationId|expectedBuyerName)"):
            tool.execute("etsy_customer_messages_publish", {
                "selector": {"type": "customer_id", "value": "C-1"},
                "idempotencyKey": "stable",
                "messageType": "text",
                "content": "hello",
            }, client)
        self.assertEqual(client.calls, [])

    def test_publish_result_unknown_is_not_safe_to_retry(self):
        client = FakeClient([(200, {"ok": True, "job": {
            "status": "result_unknown",
            "note": "proof missing",
        }})])
        result = tool.execute("etsy_customer_messages_publish", {
            "selector": {"type": "customer_id", "value": "C-1"},
            "conversationId": "etsy:70001",
            "expectedBuyerName": "G G",
            "idempotencyKey": "stable",
            "messageType": "text",
            "content": "hello",
        }, client)
        self.assertEqual(result["outcome"], "unknown")
        self.assertFalse(result["errors"][0]["safeToRetry"])
        self.assertEqual(result["errors"][0]["actionRequired"], "verify_status_only")

    def test_publish_transport_error_is_unknown_and_not_safe_to_retry(self):
        client = FakeClient([])
        client.post = Mock(side_effect=tool.ToolFailure(
            "TRANSPORT_ERROR",
            "connection reset",
            retryable=True,
            safe_to_retry=True,
        ))
        with self.assertRaises(tool.ToolFailure) as raised:
            tool.execute("etsy_customer_messages_publish", {
                "selector": {"type": "customer_id", "value": "C-1"},
                "conversationId": "etsy:70001",
                "expectedBuyerName": "G G",
                "idempotencyKey": "stable",
                "messageType": "text",
                "content": "hello",
            }, client)
        self.assertEqual(raised.exception.code, "RESULT_UNKNOWN")
        self.assertFalse(raised.exception.safe_to_retry)
        self.assertEqual(raised.exception.action_required, "verify_status_only")

    def test_public_listing_poll_returns_one_common_envelope(self):
        client = FakeClient([
            (202, {"ok": True, "requestId": "internal-listing"}),
            (200, {
                "ok": True,
                "requestedCount": 1,
                "resultCount": 1,
                "truncated": False,
                "results": [{"completeness": {"status": "complete"}}],
                "errors": [],
            }),
        ])
        result = tool.execute("etsy_listings_get", {
            "scope": "single",
            "fields": "public",
            "urls": ["https://www.etsy.com/listing/123/example"],
        }, client)
        self.assertEqual(result["tool"], "etsy_listings_get")
        self.assertEqual(client.calls[0][0], "/api/hermes/etsy/tools/listings/get")
        self.assertNotIn("internal-listing", str(result))

    def test_admin_listing_also_uses_short_polling_transport(self):
        client = FakeClient([
            (202, {"ok": True, "requestId": "internal-admin"}),
            (200, {
                "ok": True,
                "requestedCount": 1,
                "resultCount": 1,
                "truncated": False,
                "results": [{"completeness": {"status": "complete"}}],
                "errors": [],
            }),
        ])
        result = tool.execute("etsy_listings_get", {
            "scope": "single",
            "fields": "seller_admin",
            "urls": ["https://www.etsy.com/listing/123/example"],
        }, client)
        self.assertEqual(result["outcome"], "complete")
        self.assertEqual(client.calls[0][0], "/api/hermes/etsy/tools/listings/get")
        self.assertEqual(client.calls[1][0], "/api/hermes/etsy/tools/listings/get/result")
        self.assertNotIn("internal-admin", str(result))


if __name__ == "__main__":
    unittest.main()


class OrderSopToolsTest(unittest.TestCase):
    """订单 SOP 三工具（P3）：路径显式、输入白名单收紧、信封透传、工具名校验 fail-closed。"""

    def _final(self, tool_name, data=None):
        return {
            "schemaVersion": "etsy-agent-tool/v1",
            "tool": tool_name,
            "ok": True,
            "outcome": "complete",
            "data": data or {},
            "completeness": {"status": "complete", "truncated": False},
            "errors": [],
        }

    def test_get_has_explicit_path_and_whitelist(self):
        client = FakeClient([(200, self._final("etsy_order_sop_get", {"orders": [], "count": 0}))])
        tool.execute("etsy_order_sop_get", {"orderNumber": "4137840459"}, client)
        self.assertEqual(client.calls[0][0], "/api/hermes/etsy/tools/order-sop/get")
        self.assertEqual(client.calls[0][1], {"orderNumber": "4137840459"})
        with self.assertRaises(tool.ToolFailure):
            tool.execute("etsy_order_sop_get", {"orderNo": "x"}, FakeClient([]))

    def test_update_requires_order_and_status_and_is_mutation(self):
        client = FakeClient([(200, self._final("etsy_order_sop_update", {"orderNumber": "1", "noop": True}))])
        tool.execute("etsy_order_sop_update", {"orderNumber": "1", "stepId": "packing", "status": "done"}, client)
        self.assertEqual(client.calls[0][0], "/api/hermes/etsy/tools/order-sop/update")
        with self.assertRaises(tool.ToolFailure):
            tool.execute("etsy_order_sop_update", {"orderNumber": "1"}, FakeClient([]))
        # 500 属于写操作：retryable 但 safe_to_retry=False（先核对真实状态再重试）
        try:
            tool.execute(
                "etsy_order_sop_update",
                {"orderNumber": "1", "stepId": "packing", "status": "done"},
                FakeClient([(500, {"error": "BOOM"})]),
            )
            self.fail("expected ToolFailure")
        except tool.ToolFailure as failure:
            self.assertTrue(failure.retryable)
            self.assertFalse(failure.safe_to_retry)

    def test_propose_requires_idempotency_and_changes(self):
        client = FakeClient([
            (200, self._final("etsy_order_sop_propose_flow_change", {"proposalId": "osp_1", "proposalStatus": "pending_confirmation"}))
        ])
        tool.execute(
            "etsy_order_sop_propose_flow_change",
            {"idempotencyKey": "k1", "changes": [{"op": "disable", "stepId": "followup"}]},
            client,
        )
        self.assertEqual(client.calls[0][0], "/api/hermes/etsy/tools/order-sop/propose-flow-change")
        with self.assertRaises(tool.ToolFailure):
            tool.execute("etsy_order_sop_propose_flow_change", {"changes": []}, FakeClient([]))

    def test_final_tool_name_mismatch_is_fail_closed(self):
        client = FakeClient([(200, self._final("get_etsy_orders"))])
        with self.assertRaises(tool.ToolFailure):
            tool.execute("etsy_order_sop_get", {"orderNumber": "1"}, client)

    def test_envelope_failure_passes_through_with_closed_set_code(self):
        failed = {
            "schemaVersion": "etsy-agent-tool/v1",
            "tool": "etsy_order_sop_update",
            "ok": False,
            "outcome": "failed",
            "data": {},
            "completeness": {"status": "failed", "truncated": False},
            "errors": [{"code": "ORDER_SOP_ORDER_NOT_FOUND", "message": "x", "retryable": False, "safeToRetry": True}],
        }
        result = tool.execute(
            "etsy_order_sop_update",
            {"orderNumber": "999", "stepId": "packing", "status": "done"},
            FakeClient([(200, failed)]),
        )
        self.assertEqual(result["errors"][0]["code"], "ORDER_SOP_ORDER_NOT_FOUND")
