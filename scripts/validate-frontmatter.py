#!/usr/bin/env python3
"""校验所有 SKILL.md frontmatter 的层契约 + 封存话术指纹白名单。

始终启用(#116 基线):
  ① name 与目录名一致
  ② layer 必填且 ∈ {foundation, application, utility-input}
  ③ depends-on 每项都指向一个真实存在的 skill 目录

始终启用(#117):
  ⑤ 封存话术指纹白名单:统一话术真源在 shared/platform-config.md §封存协议 的
    「统一回复话术」行,全仓 .md 引用必须逐字一致(截断 / 改写 = FAIL);
    CHANGELOG.md 历史记录豁免。

随内容票启用:
  ④ --desc-limit N    description ≤ N 字(#118 description 瘦身后在 CI 打开)
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYERS = ("foundation", "application", "utility-input")

FM_RE = re.compile(r"\A---\n(.*?)\n---\n", re.S)
ITEM_RE = re.compile(r"^\s*-\s*(.+?)\s*$")

# 机检⑤:话术真源文件 + 提取锚点行 + 指纹锚词(命中其一即必须落在真源话术的字节范围内)。
# 锚词取一前一后:「当前版本专注 Etsy」抓改尾/截断,「小红书功能」抓改头(两词均不出现在其他语境)。
SHELVING_SOURCE = Path("shared/platform-config.md")
REPLY_MARKER_RE = re.compile(r"^\s*-\s*\*\*统一回复话术\*\*.*?「(.+?)」", re.M)
FINGERPRINT_ANCHORS = ("当前版本专注 Etsy", "小红书功能")
FINGERPRINT_SKIP_PARTS = {".git", ".codex", ".claude", ".gstack", "node_modules", ".cache", "__pycache__", ".quarantine"}
FINGERPRINT_SKIP_FILES = {"CHANGELOG.md"}


def parse_flow_list(value: str) -> list[str]:
    inner = value[1:-1].strip()
    return [item.strip() for item in inner.split(",") if item.strip()] if inner else []


def parse_frontmatter(text: str) -> dict[str, str | list[str]] | None:
    match = FM_RE.match(text)
    if not match:
        return None
    parsed: dict[str, str | list[str]] = {}
    current_key: str | None = None
    for line in match.group(1).splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        item = ITEM_RE.match(line)
        if item and current_key:
            value = item.group(1).strip()
            existing = parsed[current_key]
            if isinstance(existing, list):
                existing.append(value)
            elif existing == "":
                parsed[current_key] = [value]
            else:
                parsed[current_key] = [existing, value]
            continue
        key, sep, value = line.partition(":")
        if not sep:
            continue
        current_key = key.strip()
        value = value.strip()
        if value.startswith("[") and value.endswith("]"):
            parsed[current_key] = parse_flow_list(value)
        else:
            parsed[current_key] = value
    return parsed


def get_depends_on(parsed: dict[str, str | list[str]]) -> list[str]:
    raw = parsed.get("depends-on", "")
    if isinstance(raw, list):
        return raw
    if raw.startswith("[") and raw.endswith("]"):
        return parse_flow_list(raw)
    return [raw] if raw else []


def skill_dirs(root: Path) -> list[Path]:
    return sorted(path.parent for path in root.glob("*/SKILL.md"))


def check_skill(skill_dir: Path, root: Path, desc_limit: int | None = None) -> list[str]:
    path = skill_dir / "SKILL.md"
    violations: list[str] = []
    parsed = parse_frontmatter(path.read_text(encoding="utf-8"))
    if parsed is None:
        return [f"{skill_dir.name}: 缺少 frontmatter"]

    name = parsed.get("name", "")
    if not name:
        violations.append(f"{skill_dir.name}: frontmatter 缺 name")
    elif name != skill_dir.name:
        violations.append(f"{skill_dir.name}: name '{name}' 与目录名不一致")

    layer = parsed.get("layer", "")
    if not layer:
        violations.append(f"{skill_dir.name}: frontmatter 缺 layer(枚举 {' | '.join(LAYERS)})")
    elif layer not in LAYERS:
        violations.append(f"{skill_dir.name}: layer '{layer}' 不在枚举内({' | '.join(LAYERS)})")

    if "depends-on" in parsed:
        known = {d.name for d in skill_dirs(root)}
        for dep in get_depends_on(parsed):
            if dep and dep not in known:
                violations.append(f"{skill_dir.name}: depends-on 目标不存在: {dep}")

    if desc_limit is not None and len(parsed.get("description", "")) > desc_limit:
        violations.append(
            f"{skill_dir.name}: description {len(parsed['description'])} 字 > 上限 {desc_limit}"
        )
    return violations


def collect_violations(root: Path, desc_limit: int | None = None) -> list[str]:
    violations: list[str] = []
    for skill_dir in skill_dirs(root):
        violations.extend(check_skill(skill_dir, root, desc_limit=desc_limit))
    return violations


def extract_shelved_reply(root: Path) -> str | None:
    """从 shared/platform-config.md §封存协议 提取统一回复话术(机检⑤的真源,不硬编码)。"""
    source = root / SHELVING_SOURCE
    if not source.is_file():
        return None
    matches = REPLY_MARKER_RE.findall(source.read_text(encoding="utf-8"))
    return matches[0] if len(matches) == 1 else None


def fingerprint_scan_files(root: Path) -> list[Path]:
    return sorted(
        path
        for path in root.rglob("*.md")
        if not any(part in FINGERPRINT_SKIP_PARTS for part in path.relative_to(root).parts)
        and path.name not in FINGERPRINT_SKIP_FILES
    )


def check_shelving_fingerprints(root: Path, canonical: str) -> list[str]:
    """机检⑤:全仓 .md 里每个封存话术指纹锚词的命中,都必须落在真源话术的字节范围内。"""
    violations: list[str] = []
    reported: set[tuple[Path, int]] = set()
    for path in fingerprint_scan_files(root):
        text = path.read_text(encoding="utf-8")
        covered = [m.start() for m in re.finditer(re.escape(canonical), text)]
        for anchor in FINGERPRINT_ANCHORS:
            for hit in re.finditer(re.escape(anchor), text):
                pos = hit.start()
                if any(start <= pos < start + len(canonical) for start in covered):
                    continue
                line = text.count("\n", 0, pos) + 1
                if (path, line) in reported:
                    continue
                reported.add((path, line))
                snippet = text[max(0, pos - 12) : pos + 36].replace("\n", " ")
                violations.append(
                    f"{path.relative_to(root).as_posix()}: 第 {line} 行 封存话术指纹变体"
                    f"「…{snippet}…」≠ 真源话术({SHELVING_SOURCE.as_posix()} §封存协议,机检⑤)"
                )
    return violations


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="校验 SKILL.md frontmatter 层契约")
    parser.add_argument(
        "--desc-limit",
        type=int,
        default=None,
        help="启用检查④:description ≤ N 字(#118 瘦身后在 CI 打开)",
    )
    args = parser.parse_args(argv)

    violations = collect_violations(ROOT, desc_limit=args.desc_limit)

    canonical = extract_shelved_reply(ROOT)
    if canonical is None:
        violations.append(
            f"{SHELVING_SOURCE.as_posix()}: §封存协议 提取不到(且仅一条)「统一回复话术」行(机检⑤真源)"
        )
    else:
        violations.extend(check_shelving_fingerprints(ROOT, canonical))

    if violations:
        print("frontmatter violations:", file=sys.stderr)
        for item in violations:
            print(f"- {item}", file=sys.stderr)
        return 1
    print(f"frontmatter: PASS ({len(skill_dirs(ROOT))} skills)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
