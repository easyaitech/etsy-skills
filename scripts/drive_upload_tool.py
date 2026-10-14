#!/usr/bin/env python3
"""把店长自己生成的文件传进店主的飞书云盘素材库，打印一条可以直接发给店主的链接。

为什么需要它（2026-08-09 店主实测的缺口）：
    店长按技能生成了一封 PDF 信，然后只能说「文件在我本地」——后端此前**只有下行没有上行**，
    没有任何接口能把 agent 手上的字节写进云盘。于是全局红线「不要把本地路径发给租客」与
    「东西只在本地」直接对撞，店主什么都拿不到。

    直接让 agent 用 curl 拼一个内嵌几 MB base64 的 JSON 太脆（引号、折行、体积），
    所以封装成命令：读文件 → base64 → POST /api/hermes/drive/upload-file → 打印回执。

用法：
    upload_to_drive --folder 输出 --file /abs/path/年年有余-附信.pdf
    upload_to_drive --folder 客户 --file /abs/path/report.pdf --name 2026-08-对账单.pdf

落点：只能是店主素材库里**已登记**的目录（目录名写错时后端会把可用目录逐字列出来）。
默认用「输出」——那是店长生成物的落点；跟某个 SKU / 客户强相关的才放「商品」「客户」。

输出：stdout 恰好一个 JSON 对象。ok=true 时带 url（把它发给店主）；ok=false 时带逐字 error 与
detail——那意味着**文件没进云盘**，如实说没传成，别报成已上传，也别退回去给本地路径。
退出码：0=成功，1=用法/环境问题，2=文件不合格（名字/大小/内容），3=上传失败。
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "drive-upload-tool/v1"
# 与后端 DRIVE_UPLOAD_MAX_BYTES 同源（飞书 files/upload_all 单次上限 20MB）。
MAX_BYTES = 20 * 1024 * 1024
DEFAULT_FOLDER = "输出"

EXIT_OK = 0
EXIT_USAGE = 1
EXIT_REJECTED = 2
EXIT_UPLOAD = 3


class Failure(Exception):
    def __init__(self, code: str, detail: str, exit_code: int) -> None:
        super().__init__(detail)
        self.code = code
        self.detail = detail
        self.exit_code = exit_code


def emit(payload: dict[str, Any]) -> None:
    print(json.dumps({"schemaVersion": SCHEMA_VERSION, **payload}, ensure_ascii=False, indent=2))


def runtime() -> tuple[str, str, str]:
    base = os.environ.get("YANGGEDIANZHANG_API_BASE", "").rstrip("/")
    tenant = os.environ.get("YANGGEDIANZHANG_TENANT_ID", "").strip()
    token = os.environ.get("YANGGEDIANZHANG_HERMES_TOOL_TOKEN", "").strip()
    if not base or not tenant or not token or any(ord(char) < 32 for char in token):
        raise Failure(
            "RUNTIME_NOT_CONFIGURED",
            "运行时没注入 YANGGEDIANZHANG_API_BASE / TENANT_ID / HERMES_TOOL_TOKEN，传不了",
            EXIT_USAGE,
        )
    return base, tenant, token


def read_payload(path: Path, name_override: str) -> tuple[str, bytes]:
    if not path.is_file():
        raise Failure("LOCAL_FILE_NOT_FOUND", f"本地没有这个文件：{path}", EXIT_USAGE)
    size = path.stat().st_size
    if size == 0:
        raise Failure("FILE_EMPTY", f"{path} 是空文件", EXIT_REJECTED)
    if size > MAX_BYTES:
        raise Failure("FILE_TOO_LARGE", f"{path} 有 {size} 字节，超过上限 {MAX_BYTES}", EXIT_REJECTED)
    file_name = (name_override or path.name).strip()
    # 名字的完整规则在后端（单一权威）；这里只挡住最常见的一种手滑：把整条路径当成了文件名。
    if "/" in file_name or "\\" in file_name:
        raise Failure("FILE_NAME_INVALID", "文件名里不能有路径分隔符——目录用 --folder 指定", EXIT_REJECTED)
    return file_name, path.read_bytes()


def upload(base: str, tenant: str, token: str, folder: str, file_name: str, data: bytes) -> dict[str, Any]:
    body = json.dumps(
        {
            "tenantId": tenant,
            "folder": folder,
            "fileName": file_name,
            "contentBase64": base64.b64encode(data).decode("ascii"),
        },
        ensure_ascii=False,
    )
    # 令牌经 --config /dev/fd/N 传给 curl，不进 argv（同机任何进程都能读 /proc/*/cmdline）。
    config_read, config_write = os.pipe()
    escaped = token.replace("\\", "\\\\").replace('"', '\\"')
    os.write(
        config_write,
        f'header = "Authorization: Bearer {escaped}"\nheader = "Content-Type: application/json"\n'.encode(),
    )
    os.close(config_write)
    try:
        process = subprocess.run(
            [
                "curl",
                "--config",
                f"/dev/fd/{config_read}",
                "-sS",
                # 生产 ECS → 飞书上行实测只有 ~140KB/s，20MB 最坏要两分多钟；这里给足余量，
                # 免得客户端先超时、而文件其实已经传上去了（那会让 agent 重传出重复文件）。
                "--max-time",
                "300",
                "-X",
                "POST",
                f"{base}/api/hermes/drive/upload-file",
                "--data-binary",
                "@-",
                "--write-out",
                "\n%{http_code}",
            ],
            input=body,
            text=True,
            capture_output=True,
            check=False,
            pass_fds=(config_read,),
        )
    finally:
        os.close(config_read)

    if process.returncode != 0:
        raise Failure("TRANSPORT_ERROR", process.stderr.strip() or f"curl exited {process.returncode}", EXIT_UPLOAD)
    raw, separator, status_text = process.stdout.rpartition("\n")
    if not separator or not status_text.isdigit():
        raise Failure("NON_JSON_RESPONSE", "后端响应缺少可验证的 HTTP 状态", EXIT_UPLOAD)
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise Failure("NON_JSON_RESPONSE", "后端返回的不是 JSON", EXIT_UPLOAD) from exc
    if not isinstance(payload, dict):
        raise Failure("INVALID_RESPONSE", "后端 JSON 不是对象", EXIT_UPLOAD)
    if status_text != "200" or not payload.get("ok"):
        code = str(payload.get("error") or f"HTTP_{status_text}")
        detail = str(payload.get("detail") or payload.get("ownerHint") or f"后端返回 HTTP {status_text}")
        raise Failure(code, detail, EXIT_REJECTED if status_text in {"400", "404", "413"} else EXIT_UPLOAD)
    return payload


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        prog="upload_to_drive",
        description="把本地文件传进店主的飞书云盘素材库，返回可发给店主的链接",
    )
    parser.add_argument("--folder", default=DEFAULT_FOLDER, help=f"素材库目录名（默认「{DEFAULT_FOLDER}」）")
    parser.add_argument("--file", required=True, help="本地文件绝对路径")
    parser.add_argument("--name", default="", help="上传后的文件名（默认用本地文件名）")
    args = parser.parse_args(argv)

    try:
        base, tenant, token = runtime()
        file_name, data = read_payload(Path(args.file).expanduser(), args.name)
        result = upload(base, tenant, token, args.folder, file_name, data)
    except Failure as failure:
        emit({"ok": False, "error": failure.code, "detail": failure.detail, "uploaded": False})
        return failure.exit_code

    emit(
        {
            "ok": True,
            "folder": result.get("folder", args.folder),
            "fileName": result.get("fileName", file_name),
            "bytes": result.get("bytes", len(data)),
            **({"url": result["url"]} if result.get("url") else {}),
            "ownerHint": result.get("ownerHint", ""),
        }
    )
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
