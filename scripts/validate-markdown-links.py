#!/usr/bin/env python3
"""Fail on broken repository-relative Markdown links."""

from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
LINK = re.compile(r"!?\[[^\]]*]\(([^)]+)\)")
SKIP_PARTS = {".git", ".codex", ".claude", ".gstack", "node_modules", ".quarantine"}
SKIP_FILES = {"CHANGELOG.md"}


def markdown_files() -> list[Path]:
    return sorted(
        path
        for path in ROOT.rglob("*.md")
        if not any(part in SKIP_PARTS for part in path.relative_to(ROOT).parts)
        and path.name not in SKIP_FILES
    )


def local_target(raw: str) -> str | None:
    target = raw.strip()
    if target.startswith("<") and target.endswith(">"):
        target = target[1:-1]
    if not target or target.startswith(("#", "/", "mailto:", "http://", "https://")):
        return None
    target = target.split("#", 1)[0].split("?", 1)[0]
    return unquote(target) if target else None


def main() -> int:
    broken: list[str] = []
    checked = 0
    for source in markdown_files():
        for match in LINK.finditer(source.read_text(encoding="utf-8")):
            target = local_target(match.group(1))
            if target is None:
                continue
            checked += 1
            resolved = (source.parent / target).resolve()
            try:
                resolved.relative_to(ROOT)
            except ValueError:
                broken.append(f"{source.relative_to(ROOT)} -> {target} (outside repository)")
                continue
            if not resolved.exists():
                broken.append(f"{source.relative_to(ROOT)} -> {target}")
    if broken:
        print("Broken Markdown links:", file=sys.stderr)
        for item in broken:
            print(f"- {item}", file=sys.stderr)
        return 1
    print(f"markdown-links: PASS ({checked} relative links)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
