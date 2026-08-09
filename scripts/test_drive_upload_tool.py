#!/usr/bin/env python3
"""upload_to_drive 的入参与回执测试。

重点在**失败路径的说法**：上传没成时回执必须让 agent 说「文件没进云盘」，
而不是顺嘴报「已上传」或退回去给本地路径——那两种说法正是这条缺口最初的形态。
"""

from __future__ import annotations

import base64
import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

MODULE_PATH = Path(__file__).with_name("drive_upload_tool.py")
SPEC = importlib.util.spec_from_file_location("drive_upload_tool", MODULE_PATH)
assert SPEC and SPEC.loader
tool = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(tool)

ENV = {
    "YANGGEDIANZHANG_API_BASE": "https://yanggedianzhang.test",
    "YANGGEDIANZHANG_TENANT_ID": "tenant_test",
    "YANGGEDIANZHANG_HERMES_TOOL_TOKEN": "tok",
}


class FakeCompleted:
    def __init__(self, stdout: str, returncode: int = 0, stderr: str = "") -> None:
        self.stdout = stdout
        self.returncode = returncode
        self.stderr = stderr


class DriveUploadToolTest(unittest.TestCase):
    def setUp(self) -> None:
        self.workdir = Path(tempfile.mkdtemp())
        self.pdf = self.workdir / "年年有余-附信.pdf"
        self.pdf.write_bytes(b"%PDF-1.7\n year of plenty \n%%EOF\n")

    def tearDown(self) -> None:
        shutil.rmtree(self.workdir, ignore_errors=True)

    def run_tool(self, argv: list[str], response: FakeCompleted) -> tuple[int, dict, dict]:
        """跑一次 main()，回 (退出码, 打印出来的 JSON, 发给后端的 body)。"""
        sent: dict = {}

        def fake_run(cmd, **kwargs):  # noqa: ANN001
            sent.update(json.loads(kwargs["input"]))
            return response

        printed: list[str] = []
        with patch.dict("os.environ", ENV, clear=False), patch.object(
            tool.subprocess, "run", side_effect=fake_run
        ), patch("builtins.print", side_effect=lambda *a, **k: printed.append(str(a[0]))):
            code = tool.main(argv)
        return code, json.loads(printed[-1]), sent

    def test_uploads_bytes_and_returns_link(self) -> None:
        response = FakeCompleted(
            json.dumps(
                {
                    "ok": True,
                    "folder": "素材库/输出",
                    "fileName": "年年有余-附信.pdf",
                    "bytes": self.pdf.stat().st_size,
                    "url": "https://feishu.test/file/f1",
                    "ownerHint": "已上传",
                }
            )
            + "\n200"
        )
        code, printed, sent = self.run_tool(["--folder", "输出", "--file", str(self.pdf)], response)
        self.assertEqual(code, tool.EXIT_OK)
        self.assertEqual(printed["url"], "https://feishu.test/file/f1")
        # 发出去的 base64 必须是文件原字节，不能少一截
        self.assertEqual(base64.b64decode(sent["contentBase64"]), self.pdf.read_bytes())
        self.assertEqual(sent["folder"], "输出")
        self.assertEqual(sent["fileName"], "年年有余-附信.pdf")

    def test_defaults_to_output_folder(self) -> None:
        response = FakeCompleted(json.dumps({"ok": True}) + "\n200")
        _, _, sent = self.run_tool(["--file", str(self.pdf)], response)
        self.assertEqual(sent["folder"], tool.DEFAULT_FOLDER)

    def test_name_override(self) -> None:
        response = FakeCompleted(json.dumps({"ok": True}) + "\n200")
        _, _, sent = self.run_tool(["--file", str(self.pdf), "--name", "对账单.pdf"], response)
        self.assertEqual(sent["fileName"], "对账单.pdf")

    def test_backend_rejection_is_relayed_verbatim_and_says_not_uploaded(self) -> None:
        # 后端把「店主自己能修」的原因逐字回来了，这里不能改写成笼统的一句「传失败」。
        response = FakeCompleted(
            json.dumps({"ok": False, "error": "ASSET_LIBRARY_FOLDER_NOT_FOUND", "ownerHint": "目录名不对"}) + "\n404"
        )
        code, printed, _ = self.run_tool(["--folder", "信件", "--file", str(self.pdf)], response)
        self.assertEqual(code, tool.EXIT_REJECTED)
        self.assertEqual(printed["error"], "ASSET_LIBRARY_FOLDER_NOT_FOUND")
        self.assertFalse(printed["ok"])
        self.assertFalse(printed["uploaded"])

    def test_transport_failure_says_not_uploaded(self) -> None:
        response = FakeCompleted("", returncode=7, stderr="could not connect")
        code, printed, _ = self.run_tool(["--file", str(self.pdf)], response)
        self.assertEqual(code, tool.EXIT_UPLOAD)
        self.assertEqual(printed["error"], "TRANSPORT_ERROR")
        self.assertFalse(printed["uploaded"])

    def test_missing_local_file(self) -> None:
        code, printed, _ = self.run_tool(
            ["--file", str(self.workdir / "nope.pdf")], FakeCompleted(json.dumps({"ok": True}) + "\n200")
        )
        self.assertEqual(code, tool.EXIT_USAGE)
        self.assertEqual(printed["error"], "LOCAL_FILE_NOT_FOUND")

    def test_empty_file_rejected_before_upload(self) -> None:
        empty = self.workdir / "empty.pdf"
        empty.write_bytes(b"")
        code, printed, sent = self.run_tool(
            ["--file", str(empty)], FakeCompleted(json.dumps({"ok": True}) + "\n200")
        )
        self.assertEqual(code, tool.EXIT_REJECTED)
        self.assertEqual(printed["error"], "FILE_EMPTY")
        self.assertEqual(sent, {})

    def test_path_in_name_rejected(self) -> None:
        code, printed, _ = self.run_tool(
            ["--file", str(self.pdf), "--name", "letters/福.pdf"],
            FakeCompleted(json.dumps({"ok": True}) + "\n200"),
        )
        self.assertEqual(code, tool.EXIT_REJECTED)
        self.assertEqual(printed["error"], "FILE_NAME_INVALID")


if __name__ == "__main__":
    unittest.main()
