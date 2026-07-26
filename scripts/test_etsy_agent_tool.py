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


class EtsyAgentToolTest(unittest.TestCase):
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
