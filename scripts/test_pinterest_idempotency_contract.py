import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]


class PinterestIdempotencyContractTest(unittest.TestCase):
    def test_skill_requires_server_owned_idempotent_enqueue_and_cancel(self):
        skill = (ROOT / "pinterest-autopin" / "SKILL.md").read_text(encoding="utf-8")
        flow = (ROOT / "pinterest-autopin" / "references" / "publishing-flow.md").read_text(
            encoding="utf-8"
        )

        for anchor in (
            '"dispatched": true',
            "/api/tools/pinterest/publish-intents/enqueue",
            "/api/tools/pinterest/publish-intents/cancel",
            "禁止用通用 Base",
            "has_more=false",
        ):
            self.assertIn(anchor, skill)

        for anchor in (
            '"idempotencyKey"',
            '"displayIntentId"',
            '"expectedTaskId"',
            "PINTEREST_PUBLISH_CANCEL_TOO_LATE",
            "PINTEREST_PUBLISH_CANCEL_VERIFY_FAILED",
            "PINTEREST_PUBLISH_INTENT_SCHEDULE_INVALID",
            "PINTEREST_PUBLISH_INTENT_LEGACY_UNSAFE",
            "有序解析后的 Drive file token",
        ):
            self.assertIn(anchor, flow)


if __name__ == "__main__":
    unittest.main()
