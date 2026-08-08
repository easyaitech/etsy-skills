#!/usr/bin/env python3
"""install_skill_package 的落盘与准入闸测试。

重点不在「能不能装成功」，而在**装不进去的那些形态**：zip slip、软链、占用官方技能名、
覆盖到软链目标。这几条一旦漏掉，后果都是「装完之后很难发现」——契约被静默换掉、
凭据被解成技能内容、文件写到 skills 目录外面。
"""

from __future__ import annotations

import importlib.util
import os
import shutil
import stat
import tempfile
import unittest
import zipfile
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("install_skill_package.py")
SPEC = importlib.util.spec_from_file_location("install_skill_package", MODULE_PATH)
assert SPEC and SPEC.loader
isp = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(isp)


def skill_md(name: str, description: str = "测试技能。") -> str:
    return f"---\nname: {name}\ndescription: {description}\n---\n\n# {name}\n\n正文。\n"


def build_zip(path: Path, members: dict[str, str], *, symlinks: dict[str, str] | None = None) -> Path:
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, content in members.items():
            archive.writestr(name, content)
        for name, target in (symlinks or {}).items():
            info = zipfile.ZipInfo(name)
            info.external_attr = (stat.S_IFLNK | 0o777) << 16
            archive.writestr(info, target)
    return path


class InstallSkillPackageTest(unittest.TestCase):
    def setUp(self) -> None:
        self.workdir = Path(tempfile.mkdtemp())
        self.skills = self.workdir / "skills"
        self.skills.mkdir()

    def tearDown(self) -> None:
        shutil.rmtree(self.workdir, ignore_errors=True)

    def good_package(self, name: str = "shop-letter") -> Path:
        return build_zip(
            self.workdir / f"{name}.skill",
            {
                f"{name}/SKILL.md": skill_md(name),
                f"{name}/scripts/make.py": "print('letter')\n",
                f"{name}/references/guide.md": "# 指南\n",
            },
        )

    # ---- 通过路径 ----

    def test_inspect_reports_name_files_and_sizes(self) -> None:
        manifest = isp.inspect_package(self.good_package())
        self.assertEqual(manifest["skillName"], "shop-letter")
        self.assertEqual(manifest["description"], "测试技能。")
        self.assertEqual(
            [item["path"] for item in manifest["files"]],
            ["SKILL.md", "references/guide.md", "scripts/make.py"],
        )

    def test_install_strips_top_level_dir_and_lands_under_skills(self) -> None:
        package = self.good_package()
        manifest = isp.inspect_package(package)
        result = isp.install(package, manifest, self.skills, force=False)
        installed = self.skills / "shop-letter"
        self.assertEqual(result["installedPath"], str(installed))
        self.assertTrue((installed / "SKILL.md").is_file())
        self.assertTrue((installed / "scripts/make.py").is_file())
        # 顶层目录被剥掉：不该出现 skills/shop-letter/shop-letter/…
        self.assertFalse((installed / "shop-letter").exists())
        # 临时解压目录不留残骸（否则 skills_list 会把它当成半个技能扫出来）
        self.assertEqual([p.name for p in self.skills.iterdir()], ["shop-letter"])

    def test_reinstall_needs_force_and_backs_up_the_old_copy(self) -> None:
        package = self.good_package()
        manifest = isp.inspect_package(package)
        isp.install(package, manifest, self.skills, force=False)
        (self.skills / "shop-letter" / "本地改动.md").write_text("店主自己加的\n", encoding="utf-8")

        with self.assertRaises(isp.Failure) as caught:
            isp.install(package, manifest, self.skills, force=False)
        self.assertEqual(caught.exception.code, "SKILL_ALREADY_INSTALLED")

        result = isp.install(package, manifest, self.skills, force=True)
        # 覆盖前必须留下旧的一份：技能目录里可能有店主自己改过的东西，静默丢掉不可接受。
        backup = Path(result["replacedBackup"])
        self.assertTrue(backup.is_dir())
        self.assertTrue((backup / "本地改动.md").is_file())

    def test_executable_bit_is_kept_but_setuid_is_not(self) -> None:
        package = self.workdir / "exec.skill"
        with zipfile.ZipFile(package, "w") as archive:
            archive.writestr("shop-letter/SKILL.md", skill_md("shop-letter"))
            info = zipfile.ZipInfo("shop-letter/scripts/run.py")
            # 4755 = setuid + rwxr-xr-x：可执行位要留，setuid 位一个都不能留。
            info.external_attr = (stat.S_IFREG | 0o4755) << 16
            archive.writestr(info, "print('go')\n")
        manifest = isp.inspect_package(package)
        isp.install(package, manifest, self.skills, force=False)
        mode = (self.skills / "shop-letter" / "scripts" / "run.py").stat().st_mode
        self.assertTrue(mode & stat.S_IXUSR)
        self.assertFalse(mode & stat.S_ISUID)

    # ---- 拒绝路径 ----

    def assert_rejected(self, package: Path, code: str) -> None:
        with self.assertRaises(isp.Failure) as caught:
            isp.inspect_package(package)
        self.assertEqual(caught.exception.code, code)

    def test_rejects_zip_slip(self) -> None:
        package = build_zip(
            self.workdir / "slip.skill",
            {"evil/SKILL.md": skill_md("evil"), "evil/../../../../tmp/pwned": "x"},
        )
        self.assert_rejected(package, "SKILL_PACKAGE_UNSAFE_PATH")

    def test_rejects_symlink_entries(self) -> None:
        # 软链能把 profile 里的凭据 / 别家 workspace 解成「技能内容」被读出来。
        package = build_zip(
            self.workdir / "link.skill",
            {"evil/SKILL.md": skill_md("evil")},
            symlinks={"evil/creds": "../../.hermes/credentials.json"},
        )
        self.assert_rejected(package, "SKILL_PACKAGE_SYMLINK_ENTRY")

    def test_rejects_official_skill_names(self) -> None:
        # 同名实体目录会静默盖住官方契约软链，店长照着被换掉的契约干活且不报任何错。
        package = build_zip(
            self.workdir / "reserved.skill",
            {"orders-customers/SKILL.md": skill_md("orders-customers")},
        )
        self.assert_rejected(package, "SKILL_PACKAGE_RESERVED_NAME")

    def test_rejects_multiple_top_level_dirs(self) -> None:
        package = build_zip(
            self.workdir / "multi.skill",
            {"a-skill/SKILL.md": skill_md("a-skill"), "b-skill/SKILL.md": skill_md("b-skill")},
        )
        self.assert_rejected(package, "SKILL_PACKAGE_NOT_SINGLE_ROOT")

    def test_rejects_missing_skill_md(self) -> None:
        package = build_zip(self.workdir / "nomd.skill", {"shop-letter/README.md": "# hi\n"})
        self.assert_rejected(package, "SKILL_PACKAGE_MISSING_SKILL_MD")

    def test_rejects_frontmatter_name_mismatch(self) -> None:
        package = build_zip(
            self.workdir / "mismatch.skill",
            {"shop-letter/SKILL.md": skill_md("something-else")},
        )
        self.assert_rejected(package, "SKILL_PACKAGE_NAME_MISMATCH")

    def test_rejects_bad_directory_name(self) -> None:
        package = build_zip(self.workdir / "badname.skill", {"Shop Letter/SKILL.md": skill_md("Shop Letter")})
        self.assert_rejected(package, "SKILL_PACKAGE_BAD_SKILL_NAME")

    def test_rejects_non_zip(self) -> None:
        package = self.workdir / "notzip.skill"
        package.write_text("这是说明文档，不是压缩包\n", encoding="utf-8")
        self.assert_rejected(package, "SKILL_PACKAGE_NOT_A_ZIP")

    def test_never_overwrites_a_symlinked_skill(self) -> None:
        # 软链 = 官方技能的分发形态。保留名单本该挡住，走到这里说明名单漏了——宁可拒绝也不能换掉契约。
        package = self.good_package()
        manifest = isp.inspect_package(package)
        official = self.workdir / "official-source"
        official.mkdir()
        os.symlink(official, self.skills / "shop-letter")
        with self.assertRaises(isp.Failure) as caught:
            isp.install(package, manifest, self.skills, force=True)
        self.assertEqual(caught.exception.code, "SKILL_TARGET_IS_SYMLINK")


if __name__ == "__main__":
    unittest.main()
