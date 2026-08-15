#!/usr/bin/env python3
"""把店主放在飞书云盘素材库里的技能包（`.skill` / `.zip`）装进本 profile 的 skills 目录。

为什么需要它（2026-08-09 店主实测的缺口）：
    店主自己做了技能包（`fublessings-letter.skill`），传进了云盘素材库。店长这边能列出文件名和
    file token，但**拿不到字节**——drive/list-files 只回元数据，别的接口都是给图片用的。于是店长
    只能说「我读不到里面写了什么，没法核实」，整条自助上传的路在最后一米断掉。
    本脚本 + 后端的 `/api/hermes/skills/package-download` 补上这最后一米。

装在哪、为什么是这里：
    `$HERMES_HOME/skills/<技能名>/`——就是 Hermes 自己扫描的那个目录（tools/skills_tool.py 里
    `SKILLS_DIR = HERMES_HOME / "skills"`）。**每个 profile 一份，互不可见**，不碰共享的
    etsy-skills clone——那份是官方契约的分发源，往里写会立刻泄露到别的租户。

装完要不要重启网关：**不要**。`skills_list` / `skill_view` 每次调用都现扫磁盘
    （`_find_all_skills` 每次重新遍历 SKILLS_DIR），所以新技能立刻就能用。
    只有「系统提示里的技能索引」是缓存的——那只影响模型会不会自发想起它，不影响你显式
    `skills_list` 找得到、`skill_view` 读得到。所以装完直接用即可，别去重启网关打扰其他会话。

两侧都校验（不是重复劳动）：
    后端是权威判定（tested，见 packages/server/src/skill-package.ts），不通过就不给字节；
    本脚本落盘前再独立校验一次，因为**真正把文件写进磁盘的是这里**——写盘方自己确认路径安全，
    比信任「上游已经检查过了」可靠。zip slip 这类洞历来都是从「我以为对面查过了」来的。

用法：
    install_skill_package --folder 技能 --file-token <list-files 给的 token>
    install_skill_package --folder 技能 --file-token <token> --dry-run   # 只看内容不落盘
    install_skill_package --folder 技能 --file-token <token> --force     # 覆盖同名旧技能（旧的会备份）

输出：stdout 恰好一个 JSON 对象。ok=true 时带 skillName / installedPath / files；
ok=false 时带逐字的 error 码与 detail——原样转述给店主，别改写。
退出码：0=成功，1=用法/环境问题，2=包不合格，3=传输失败，4=落盘失败。
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import time
import zipfile
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "install-skill-package/v1"

MAX_ZIP_BYTES = 32 * 1024 * 1024
MAX_TOTAL_BYTES = 96 * 1024 * 1024
MAX_ENTRY_BYTES = 32 * 1024 * 1024
MAX_ENTRIES = 400
MAX_PATH_LENGTH = 200
MAX_SEGMENT_LENGTH = 64

SKILL_NAME_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])$")

# 与后端 SKILL_PACKAGE_RESERVED_NAMES 同源。名单只增不减：删掉一个名字 = 允许租户包静默顶掉
# 官方契约技能，店长会照着被换掉的契约干活且不报任何错。
RESERVED_NAMES = {
    "assets-library",
    "business-knowledge",
    "image-brief",
    "image-synth",
    "inventory",
    "listing-catalog",
    "logistics-tracking",
    "orders-customers",
    "pinterest-autopin",
    "publish-composer",
    "publish-metrics",
    "shop-foundation",
    "social-publisher",
    "supplier-foundation",
    "trend-radar",
    "xiaohongshu-autopost",
    "shared",
    "scripts",
    "specs",
    "tools",
    "docs",
    "skills",
    "hub",
    "archive",
    "quarantine",
}

EXIT_OK = 0
EXIT_USAGE = 1
EXIT_REJECTED = 2
EXIT_TRANSPORT = 3
EXIT_INSTALL = 4


class Failure(Exception):
    def __init__(self, code: str, detail: str, exit_code: int) -> None:
        super().__init__(detail)
        self.code = code
        self.detail = detail
        self.exit_code = exit_code


def emit(payload: dict[str, Any]) -> None:
    print(json.dumps({"schemaVersion": SCHEMA_VERSION, **payload}, ensure_ascii=False, indent=2))


# --------------------------------------------------------------------- 运行时


def runtime() -> tuple[str, str, str, Path]:
    base = os.environ.get("YANGGEDIANZHANG_API_BASE", "").rstrip("/")
    tenant = os.environ.get("YANGGEDIANZHANG_TENANT_ID", "").strip()
    token = os.environ.get("YANGGEDIANZHANG_HERMES_TOOL_TOKEN", "").strip()
    if not base or not tenant or not token or any(ord(char) < 32 for char in token):
        raise Failure(
            "RUNTIME_NOT_CONFIGURED",
            "运行时没注入 YANGGEDIANZHANG_API_BASE / TENANT_ID / HERMES_TOOL_TOKEN，装不了",
            EXIT_USAGE,
        )
    hermes_home = os.environ.get("HERMES_HOME", "").strip()
    if not hermes_home:
        raise Failure("HERMES_HOME_MISSING", "环境里没有 HERMES_HOME，定位不到本 profile 的 skills 目录", EXIT_USAGE)
    skills_dir = Path(hermes_home) / "skills"
    if not skills_dir.is_dir():
        raise Failure("SKILLS_DIR_MISSING", f"{skills_dir} 不存在或不是目录", EXIT_USAGE)
    return base, tenant, token, skills_dir


def download_package(base: str, tenant: str, token: str, folder: str, file_token: str, destination: Path) -> None:
    """POST package-download，把 zip 落到 destination。非 200 时把后端的 JSON 原样抛出。

    令牌经 `--config /dev/fd/N` 传给 curl，不进 argv——同机任何进程都能读 /proc/*/cmdline。
    """
    payload = json.dumps({"tenantId": tenant, "folder": folder, "fileToken": file_token}, ensure_ascii=False)
    config_read, config_write = os.pipe()
    escaped = token.replace("\\", "\\\\").replace('"', '\\"')
    os.write(config_write, f'header = "Authorization: Bearer {escaped}"\nheader = "Content-Type: application/json"\n'.encode())
    os.close(config_write)
    try:
        process = subprocess.run(
            [
                "curl",
                "--config",
                f"/dev/fd/{config_read}",
                "-sS",
                "--max-time",
                "180",
                "-X",
                "POST",
                f"{base}/api/hermes/skills/package-download",
                "--data-binary",
                "@-",
                "-o",
                str(destination),
                "--write-out",
                "%{http_code}",
            ],
            input=payload,
            text=True,
            capture_output=True,
            check=False,
            pass_fds=(config_read,),
        )
    finally:
        os.close(config_read)

    if process.returncode != 0:
        raise Failure("TRANSPORT_ERROR", process.stderr.strip() or f"curl exited {process.returncode}", EXIT_TRANSPORT)
    status = process.stdout.strip()
    if status == "200":
        return

    # 失败路径：body 是后端的 JSON（已被 -o 写进文件），逐字抛给上层——里面的 error/detail
    # 正是店主能自己动手修的原因（比如包里没有 SKILL.md、名字占用了内置技能）。
    try:
        body = json.loads(destination.read_text(encoding="utf-8"))
    except Exception:
        body = {}
    code = str(body.get("error") or f"HTTP_{status}")
    detail = str(body.get("detail") or body.get("ownerHint") or f"后端返回 HTTP {status}")
    raise Failure(code, detail, EXIT_REJECTED if status in {"400", "403", "413", "422"} else EXIT_TRANSPORT)


# --------------------------------------------------------------------- 包校验


def unsafe_path_reason(name: str) -> str | None:
    if not name:
        return "空路径"
    if len(name) > MAX_PATH_LENGTH:
        return f"路径过长（{len(name)} > {MAX_PATH_LENGTH}）"
    if any(ord(char) < 32 or ord(char) == 127 for char in name):
        return "路径含控制字符"
    if "\\" in name:
        return "路径含反斜杠"
    if name.startswith("/"):
        return "绝对路径"
    if re.match(r"^[A-Za-z]:", name):
        return "带盘符的绝对路径"
    for segment in name.split("/"):
        if segment == "":
            return "路径含空段"
        if segment in {".", ".."}:
            return "路径含 `.` 或 `..` 段"
        if len(segment) > MAX_SEGMENT_LENGTH:
            return f"路径段过长（{len(segment)} > {MAX_SEGMENT_LENGTH}）"
    return None


def parse_frontmatter(text: str) -> dict[str, str] | None:
    normalized = text.lstrip("﻿").replace("\r\n", "\n")
    if not normalized.startswith("---\n"):
        return None
    end = normalized.find("\n---", 3)
    if end < 0:
        return None
    fields: dict[str, str] = {}
    current = ""
    for line in normalized[4 : end + 1].split("\n"):
        if not line.strip():
            current = ""
            continue
        match = re.match(r"^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$", line)
        if match and not line[:1].isspace():
            current = match.group(1).lower()
            fields[current] = match.group(2).strip()
        elif current and line[:1].isspace():
            fields[current] = f"{fields.get(current, '')} {line.strip()}".strip()
    for key in ("name", "description"):
        value = fields.get(key, "").strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1].strip()
        fields[key] = value
    if not fields.get("name") or not fields.get("description"):
        return None
    return fields


def inspect_package(zip_path: Path) -> dict[str, Any]:
    """本地独立校验。通过则回 {skillName, description, files:[{path,bytes}], totalBytes}。"""
    size = zip_path.stat().st_size
    if size == 0:
        raise Failure("SKILL_PACKAGE_EMPTY", "下载到的文件是空的", EXIT_REJECTED)
    if size > MAX_ZIP_BYTES:
        raise Failure("SKILL_PACKAGE_TOO_LARGE", f"包 {size} 字节超过上限 {MAX_ZIP_BYTES}", EXIT_REJECTED)

    try:
        archive = zipfile.ZipFile(zip_path)
    except zipfile.BadZipFile as exc:
        raise Failure("SKILL_PACKAGE_NOT_A_ZIP", f"打不开这个 zip：{exc}", EXIT_REJECTED) from exc

    with archive:
        infos = archive.infolist()
        if not infos:
            raise Failure("SKILL_PACKAGE_EMPTY", "zip 里一个条目都没有", EXIT_REJECTED)
        if len(infos) > MAX_ENTRIES:
            raise Failure("SKILL_PACKAGE_TOO_MANY_FILES", f"条目数 {len(infos)} 超过上限 {MAX_ENTRIES}", EXIT_REJECTED)

        roots: set[str] = set()
        files: list[dict[str, Any]] = []
        total = 0
        skill_md_name = ""

        for info in infos:
            if info.flag_bits & 0x1:
                raise Failure("SKILL_PACKAGE_ENCRYPTED", "包被加密了，装不了", EXIT_REJECTED)
            mode = info.external_attr >> 16
            if mode and stat.S_ISLNK(mode):
                raise Failure("SKILL_PACKAGE_SYMLINK_ENTRY", f"{info.filename} 是符号链接——技能包里不允许带软链", EXIT_REJECTED)

            raw = info.filename
            is_dir = raw.endswith("/")
            clean = raw[:-1] if is_dir else raw
            reason = unsafe_path_reason(clean)
            if reason:
                raise Failure("SKILL_PACKAGE_UNSAFE_PATH", f"{raw}：{reason}", EXIT_REJECTED)

            segments = clean.split("/")
            roots.add(segments[0])
            if len(roots) > 1:
                raise Failure(
                    "SKILL_PACKAGE_NOT_SINGLE_ROOT",
                    f"包里有多个顶层条目（{'、'.join(sorted(roots))}）——技能包必须是「一个以技能名命名的目录」",
                    EXIT_REJECTED,
                )
            if is_dir:
                continue
            if len(segments) < 2:
                raise Failure(
                    "SKILL_PACKAGE_NOT_SINGLE_ROOT",
                    f"{raw} 直接躺在包根下——技能包必须是「一个以技能名命名的目录」",
                    EXIT_REJECTED,
                )
            if info.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
                raise Failure(
                    "SKILL_PACKAGE_UNSUPPORTED_COMPRESSION",
                    f"{raw} 用了不支持的压缩方式（method={info.compress_type}）",
                    EXIT_REJECTED,
                )
            if info.file_size > MAX_ENTRY_BYTES:
                raise Failure(
                    "SKILL_PACKAGE_ENTRY_TOO_LARGE",
                    f"{raw} 解压后 {info.file_size} 字节，超过单文件上限 {MAX_ENTRY_BYTES}",
                    EXIT_REJECTED,
                )
            total += info.file_size
            if total > MAX_TOTAL_BYTES:
                raise Failure("SKILL_PACKAGE_UNCOMPRESSED_TOO_LARGE", f"解压后总大小超过上限 {MAX_TOTAL_BYTES}", EXIT_REJECTED)

            relative = "/".join(segments[1:])
            files.append({"path": relative, "bytes": info.file_size})
            if relative == "SKILL.md":
                skill_md_name = raw

        skill_name = next(iter(roots), "")
        if not SKILL_NAME_RE.match(skill_name) or "--" in skill_name:
            raise Failure(
                "SKILL_PACKAGE_BAD_SKILL_NAME",
                f"顶层目录名「{skill_name}」不合法——只能是小写字母 / 数字 / 单个连字符，2~48 字符",
                EXIT_REJECTED,
            )
        if skill_name in RESERVED_NAMES:
            raise Failure(
                "SKILL_PACKAGE_RESERVED_NAME",
                f"「{skill_name}」是店长内置技能的名字，自带技能不能用它——换个名字重新打包",
                EXIT_REJECTED,
            )
        if not skill_md_name:
            raise Failure("SKILL_PACKAGE_MISSING_SKILL_MD", f"包里没有 {skill_name}/SKILL.md", EXIT_REJECTED)

        frontmatter = parse_frontmatter(archive.read(skill_md_name).decode("utf-8", "replace"))
        if not frontmatter:
            raise Failure(
                "SKILL_PACKAGE_MISSING_FRONTMATTER",
                "SKILL.md 开头缺少 `---` 包起来的 frontmatter，或里面没有 name / description",
                EXIT_REJECTED,
            )
        if frontmatter["name"] != skill_name:
            raise Failure(
                "SKILL_PACKAGE_NAME_MISMATCH",
                f"SKILL.md 里写的 name 是「{frontmatter['name']}」，但目录叫「{skill_name}」——两者必须一致",
                EXIT_REJECTED,
            )

    files.sort(key=lambda item: ("" if item["path"] == "SKILL.md" else "1", item["path"]))
    return {
        "skillName": skill_name,
        "description": frontmatter["description"],
        "files": files,
        "totalBytes": total,
        "packageBytes": size,
    }


# --------------------------------------------------------------------- 落盘


def safe_extract(zip_path: Path, skill_name: str, target: Path) -> None:
    """把 `<skill_name>/…` 解到 target 下（剥掉顶层目录）。每个成员再验一次落点在 target 之内。"""
    target.mkdir(parents=True, exist_ok=True)
    resolved_root = target.resolve()
    with zipfile.ZipFile(zip_path) as archive:
        for info in archive.infolist():
            raw = info.filename
            if raw.endswith("/"):
                continue
            segments = raw.split("/")
            destination = (target / "/".join(segments[1:])).resolve()
            # 最后一道闸：无论前面怎么判，真正 open() 之前必须确认路径没跑出 target。
            if resolved_root != destination and resolved_root not in destination.parents:
                raise Failure("SKILL_PACKAGE_UNSAFE_PATH", f"{raw} 会写到技能目录之外", EXIT_REJECTED)
            destination.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(info) as source, open(destination, "wb") as sink:
                shutil.copyfileobj(source, sink, length=1024 * 1024)
            # 保留可执行位（技能自带的 scripts/*.py 要能跑），但只保留 owner/group/other 的 rwx，
            # 且**绝不**保留 setuid/setgid/sticky——那些位没有任何技能需要，带上就是提权面。
            mode = (info.external_attr >> 16) & 0o777
            os.chmod(destination, mode if mode else 0o644)


def install(zip_path: Path, manifest: dict[str, Any], skills_dir: Path, force: bool) -> dict[str, Any]:
    skill_name = manifest["skillName"]
    final = skills_dir / skill_name
    replaced_from = ""

    if final.exists() or final.is_symlink():
        if not force:
            raise Failure(
                "SKILL_ALREADY_INSTALLED",
                f"{skill_name} 已经装过了；确认要覆盖就加 --force（旧的会先备份）",
                EXIT_INSTALL,
            )
        if final.is_symlink():
            # 软链几乎一定是 etsy-skills 官方技能的分发链路。保留名单本该挡住这种情况，
            # 走到这里说明名单漏了——宁可拒绝也不能顺手把官方契约换掉。
            raise Failure(
                "SKILL_TARGET_IS_SYMLINK",
                f"{final} 是软链（官方技能的分发形态），不覆盖；请给自带技能换个名字",
                EXIT_INSTALL,
            )

    staging = Path(tempfile.mkdtemp(prefix=f".install-{skill_name}-", dir=str(skills_dir)))
    try:
        payload = staging / "payload"
        safe_extract(zip_path, skill_name, payload)
        if final.exists():
            backup_root = skills_dir / ".replaced"
            backup_root.mkdir(exist_ok=True)
            backup = backup_root / f"{skill_name}-{time.strftime('%Y%m%dT%H%M%S')}"
            os.rename(final, backup)
            replaced_from = str(backup)
        os.rename(payload, final)
    except Failure:
        raise
    except OSError as exc:
        raise Failure("SKILL_INSTALL_FAILED", f"落盘失败：{exc}", EXIT_INSTALL) from exc
    finally:
        shutil.rmtree(staging, ignore_errors=True)

    return {"installedPath": str(final), "replacedBackup": replaced_from}


# --------------------------------------------------------------------- 入口


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        prog="install_skill_package",
        description="把店主放在飞书云盘素材库里的技能包装进本 profile 的 skills 目录",
    )
    parser.add_argument("--folder", required=True, help="素材库目录名，如「技能」或「素材库/技能」")
    parser.add_argument("--file-token", required=True, help="drive/list-files 返回的 fileToken")
    parser.add_argument("--force", action="store_true", help="同名技能已存在时覆盖（旧的先备份到 .replaced/）")
    parser.add_argument("--dry-run", action="store_true", help="只下载 + 校验并打印内容清单，不落盘")
    args = parser.parse_args(argv)

    try:
        base, tenant, token, skills_dir = runtime()
        with tempfile.TemporaryDirectory(prefix="skill-package-") as workdir:
            zip_path = Path(workdir) / "package.zip"
            download_package(base, tenant, token, args.folder, args.file_token, zip_path)
            manifest = inspect_package(zip_path)
            if args.dry_run:
                emit({"ok": True, "dryRun": True, **manifest})
                return EXIT_OK
            result = install(zip_path, manifest, skills_dir, args.force)
    except Failure as failure:
        emit({"ok": False, "error": failure.code, "detail": failure.detail})
        return failure.exit_code

    emit(
        {
            "ok": True,
            **manifest,
            **result,
            # 装完立刻可用：skills_list / skill_view 每次都现扫磁盘，不需要重启网关。
            "usageHint": f"已可用：skills_list 能看到 {manifest['skillName']}，skill_view 读它的 SKILL.md",
        }
    )
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
