#!/usr/bin/env python3
"""发布栈跨文件合同：manifest 是 skill 与正式工具的唯一安装源。"""

from __future__ import annotations

import importlib.util
import json
import pathlib
import re
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]


def load_module(name: str, path: pathlib.Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


agent_tool = load_module("etsy_agent_tool_contract", ROOT / "scripts" / "etsy_agent_tool.py")
skill_package = load_module("install_skill_package_contract", ROOT / "scripts" / "install_skill_package.py")


class StackContractsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.manifest = json.loads((ROOT / "etsy-stack.json").read_text(encoding="utf-8"))

    def test_manifest_is_the_complete_agent_tool_source(self) -> None:
        tools = self.manifest.get("agentTools")
        self.assertIsInstance(tools, list)
        self.assertEqual(len(tools), 11)
        self.assertEqual(len(tools), len(set(tools)))
        self.assertTrue(all(re.fullmatch(r"[a-z][a-z0-9_]*", name) for name in tools))
        self.assertEqual(set(tools), agent_tool.TOOLS)

    def test_install_and_unified_cli_delegate_manifest_tools_to_adapter(self) -> None:
        installer = (ROOT / "install.sh").read_text(encoding="utf-8")
        cli = (ROOT / "scripts" / "etsy-stack").read_text(encoding="utf-8")
        self.assertIn('m.get("agentTools")', installer)
        self.assertIn('re.fullmatch(r"[a-z][a-z0-9_]*", name)', installer)
        self.assertIn("manifest.agentTools 不得重复", installer)
        self.assertIn('for _etsy_agent_tool in "${AGENT_TOOLS[@]}"', installer)
        self.assertIn("正式 Etsy 工具名被非托管文件占用", installer)
        self.assertIn('exec "$INSTALL_DIR/scripts/etsy_agent_tool.py" "$tool_name"', cli)
        self.assertNotIn("etsy_listings_get|etsy_customer_messages_get", cli)

    def test_public_tool_contract_names_all_manifest_tools(self) -> None:
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        contract = (ROOT / "shared" / "etsy-agent-tools.md").read_text(encoding="utf-8")
        self.assertIn("十一个 Agent 工具", readme)
        self.assertIn("十一个稳定工具", contract)
        for name in self.manifest["agentTools"]:
            with self.subTest(name=name):
                self.assertIn(f"`{name}`", readme)
                self.assertIn(f"`{name}`", contract)

    def test_every_manifest_skill_is_reserved_during_package_preview(self) -> None:
        missing = sorted(set(self.manifest["skills"]) - skill_package.RESERVED_NAMES)
        self.assertEqual(missing, [])

    def test_install_recommendations_are_main_only(self) -> None:
        installer = (ROOT / "install.sh").read_text(encoding="utf-8")
        self.assertNotIn("v1.0.14/install.sh", installer)
        self.assertNotIn("推荐传具体 tag", installer)
        self.assertIn("etsy-skills/main/install.sh", installer)

    def test_publishing_contract_distinguishes_manual_and_auto_paths(self) -> None:
        architecture = (ROOT / "shared" / "tools-architecture.md").read_text(encoding="utf-8")
        paradigm = (ROOT / "shared" / "social-adapter-paradigm.md").read_text(encoding="utf-8")
        self.assertNotIn("v1 不自动 confirm-publish（保留人工目视确认闸）", architecture)
        for text in (architecture, paradigm):
            self.assertIn("自动发布", text)
            self.assertIn("到点直发", text)
            self.assertIn("无逐条人工确认", text)
        self.assertIn("手动发布", paradigm)
        self.assertIn("confirm-publish", paradigm)

    def test_ci_runs_python_both_node_packages_typecheck_and_audit(self) -> None:
        workflow = (ROOT / ".github" / "workflows" / "validate.yml").read_text(encoding="utf-8")
        for anchor in (
            "actions/setup-node@v4",
            "npm --prefix trend-radar/scripts ci",
            "npm --prefix trend-radar/scripts test",
            "npm --prefix image-synth/scripts ci",
            "npm --prefix image-synth/scripts test",
            "npm --prefix trend-radar/scripts run typecheck",
            "npm --prefix image-synth/scripts run typecheck",
            "npm --prefix trend-radar/scripts audit --audit-level=high",
            "npm --prefix image-synth/scripts audit --audit-level=high",
        ):
            with self.subTest(anchor=anchor):
                self.assertIn(anchor, workflow)


if __name__ == "__main__":
    unittest.main()
