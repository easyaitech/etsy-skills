#!/usr/bin/env python3
"""frontmatter 机检器的合同:layer 枚举、name 对齐、depends-on 可达、可选的描述长度上限。"""

from __future__ import annotations

import importlib.util
import pathlib
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


def load_module(name: str, path: pathlib.Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


validator = load_module(
    "validate_frontmatter", ROOT / "scripts" / "validate-frontmatter.py"
)


def write_skill(root: pathlib.Path, name: str, frontmatter: str) -> pathlib.Path:
    skill_dir = root / name
    skill_dir.mkdir(parents=True)
    path = skill_dir / "SKILL.md"
    path.write_text(f"---\n{frontmatter}\n---\n\n# {name}\n", encoding="utf-8")
    return skill_dir


VALID = """name: demo-skill
description: 一个用于测试的合法 skill。
layer: foundation
"""


class ParseFrontmatterTest(unittest.TestCase):
    def test_parses_simple_keys(self) -> None:
        parsed = validator.parse_frontmatter("---\nname: a\ndescription: d\n---\nbody")
        self.assertEqual(parsed["name"], "a")

    def test_parses_flow_list(self) -> None:
        parsed = validator.parse_frontmatter(
            "---\ndepends-on: [shop-foundation, listing-catalog]\n---\n"
        )
        self.assertEqual(parsed["depends-on"], ["shop-foundation", "listing-catalog"])

    def test_parses_block_list(self) -> None:
        parsed = validator.parse_frontmatter(
            "---\ndepends-on:\n  - shop-foundation\n  - listing-catalog\n---\n"
        )
        self.assertEqual(parsed["depends-on"], ["shop-foundation", "listing-catalog"])

    def test_returns_none_without_frontmatter(self) -> None:
        self.assertIsNone(validator.parse_frontmatter("# no frontmatter\n"))


class CheckSkillTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tmp.name)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_valid_skill_has_no_violations(self) -> None:
        write_skill(self.root, "demo-skill", VALID)
        path = self.root / "demo-skill"
        self.assertEqual(validator.check_skill(path, self.root), [])

    def test_name_must_match_directory(self) -> None:
        write_skill(self.root, "demo-skill", VALID.replace("demo-skill", "other-name"))
        violations = validator.check_skill(self.root / "demo-skill", self.root)
        self.assertTrue(any("name" in v for v in violations))

    def test_layer_is_required_and_enumed(self) -> None:
        write_skill(self.root, "no-layer", "name: no-layer\ndescription: d\n")
        self.assertTrue(any("layer" in v for v in validator.check_skill(self.root / "no-layer", self.root)))

        write_skill(self.root, "bad-layer", VALID.replace("foundation", "middleware"))
        self.assertTrue(any("layer" in v for v in validator.check_skill(self.root / "bad-layer", self.root)))

    def test_depends_on_must_resolve_to_existing_skill(self) -> None:
        write_skill(self.root, "shop-foundation", "name: shop-foundation\ndescription: d\nlayer: foundation\n")
        write_skill(self.root, "app", VALID.replace("demo-skill", "app") + "depends-on: [shop-foundation, ghost]\n")
        violations = validator.check_skill(self.root / "app", self.root)
        self.assertTrue(any("ghost" in v for v in violations))
        self.assertFalse(any("shop-foundation" in v for v in violations))

    def test_block_list_depends_on_is_also_checked(self) -> None:
        write_skill(
            self.root,
            "app",
            "name: app\ndescription: d\nlayer: application\ndepends-on:\n  - ghost\n",
        )
        violations = validator.check_skill(self.root / "app", self.root)
        self.assertTrue(any("ghost" in v for v in violations))

    def test_desc_limit_only_applies_when_set(self) -> None:
        long_desc = VALID.replace("一个用于测试的合法 skill。", "长" * 30)
        write_skill(self.root, "demo-skill", long_desc)
        path = self.root / "demo-skill"
        self.assertEqual(validator.check_skill(path, self.root), [])
        self.assertEqual(validator.check_skill(path, self.root, desc_limit=40), [])
        violations = validator.check_skill(path, self.root, desc_limit=20)
        self.assertTrue(any("description" in v for v in violations))


class RepoSelfTest(unittest.TestCase):
    def test_repo_frontmatter_passes_baseline_checks(self) -> None:
        violations = validator.collect_violations(ROOT)
        self.assertEqual(violations, [])


if __name__ == "__main__":
    unittest.main()
