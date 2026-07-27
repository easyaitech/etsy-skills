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

    def test_publish_replays_same_intent_until_proven_sent(self):
        request = {
            "selector": {"type": "customer_id", "value": "C-1"},
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

    def test_publish_result_unknown_is_not_safe_to_retry(self):
        client = FakeClient([(200, {"ok": True, "job": {
            "status": "result_unknown",
            "note": "proof missing",
        }})])
        result = tool.execute("etsy_customer_messages_publish", {
            "selector": {"type": "customer_id", "value": "C-1"},
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
