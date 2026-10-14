"""Exercise the real installer against a local Git remote, without network/services."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class BundleInstallTest(unittest.TestCase):
    def test_cleaner_update_installs_verified_version_even_when_already_installed(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            log = folder / "args"
            uv = folder / "uv"
            uv.write_text('#!/bin/sh\nprintf "%s\\n" "$@" > "$CLEANER_TEST_LOG"\n')
            uv.chmod(0o755)
            cleaner = folder / "remove-ai-watermarks"
            cleaner.write_text('#!/bin/sh\necho "0.45.1"\n')
            cleaner.chmod(0o755)
            result = subprocess.run(["bash", str(ROOT / "scripts/etsy-stack"), "ai-cleaner", "update"],
                                    env=dict(os.environ, PATH=str(folder) + os.pathsep + os.environ["PATH"],
                                             ECOMMERCE_SKILLS_HOME=str(ROOT), CLEANER_TEST_LOG=str(log)),
                                    text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertEqual(log.read_text().splitlines(),
                             ["tool", "install", "--force", "remove-ai-watermarks[visible]==0.45.1"])

    def test_upgrade_replaces_managed_image_skills_and_preserves_user_content(self):
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp)
            source = work / "remote"
            source.mkdir()
            files = subprocess.check_output(
                ["git", "ls-files", "--cached", "--others", "--exclude-standard"], cwd=ROOT, text=True
            ).splitlines()
            for name in files:
                src = ROOT / name
                if src.is_file():
                    dst = source / name
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(src, dst)
            def git(*args):
                subprocess.run(["git", *args], cwd=source, check=True, capture_output=True)
            git("init", "-b", "main")
            git("add", ".")
            git("-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-m", "fixture")
            installed = work / "installed"
            skills = work / "skills"
            skills.mkdir()
            (skills / "image-brief").symlink_to(installed / "image-brief")
            (skills / "image-synth").symlink_to(installed / "image-synth")
            custom = skills / "my-skill"
            custom.mkdir()
            (custom / "notes").write_text("keep")
            fakebin = work / "fakebin"
            fakebin.mkdir()
            npm = fakebin / "npm"
            npm.write_text("#!/bin/sh\nexit 0\n")
            npm.chmod(0o755)
            env = dict(os.environ, ECOMMERCE_SKILLS_REPO=str(source),
                       ECOMMERCE_SKILLS_HOME=str(installed), ECOMMERCE_SKILLS_REF="main",
                       HERMES_SKILLS_DIR=str(skills), ECOMMERCE_STACK_BIN=str(work / "bin"),
                       XDG_CACHE_HOME=str(work / "cache"), ECOMMERCE_STACK_CACHE_DIR=str(work / "cache"),
                       PATH=str(fakebin) + os.pathsep + os.environ["PATH"])
            def install():
                result = subprocess.run(["bash", str(source / "install.sh")], env=env,
                                        text=True, capture_output=True)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            install()
            for name in ("etsy-product-definition", "etsy-listing-images", "etsy-listing-builder"):
                self.assertTrue((skills / name / "SKILL.md").is_file(), name)
            for name in ("image-brief", "image-synth"):
                self.assertFalse(os.path.lexists(skills / name), name)
            self.assertEqual((custom / "notes").read_text(), "keep")
            # A retired name owned by the user must survive subsequent upgrades.
            (skills / "image-brief").mkdir()
            (skills / "image-brief" / "notes").write_text("user directory")
            external = work / "external"
            external.mkdir()
            (skills / "image-synth").symlink_to(external)
            install()
            self.assertEqual((skills / "image-brief" / "notes").read_text(), "user directory")
            self.assertEqual((skills / "image-synth").resolve(), external.resolve())


if __name__ == "__main__":
    unittest.main()
