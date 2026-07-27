#!/usr/bin/env python3
"""Validate the LLM-facing Etsy Listing read routing contract."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def require(path: str, *needles: str) -> list[str]:
    target = ROOT / path
    if not target.is_file():
        return [f"{path}: missing"]
    text = target.read_text(encoding="utf-8")
    return [f"{path}: missing {needle!r}" for needle in needles if needle not in text]


def main() -> int:
    failures: list[str] = []
    failures += require(
        "shared/etsy-listing-read.md",
        "etsy_listing_public_read",
        "etsy_listing_admin_read",
        "etsy_listings_get",
        "/api/hermes/etsy/tools/listings/get",
        "fields=public|seller_admin",
        "single",
        "batch",
        "shop",
        "100",
        "10",
        "300",
        "30",
        "320",
        "3–8",
        "$YANGGEDIANZHANG_TENANT_ID",
        "etsy-listing-read/v1",
        "data",
        "evidence",
        "unknown",
        "raw",
        "unavailable",
        "excluded",
        "errors",
        "completeness",
        "不依赖 Base",
        "不写 Etsy",
        "不写 Base",
        "禁止",
        "浏览器插件",
        "登录",
        "Challenge",
        "429",
        "巡检",
        "暂停",
        "backend-api-access.md",
    )
    failures += require(
        "listing-catalog/SKILL.md",
        "读取现有 Listing",
        "优化现有 Etsy Listing",
        "shared/etsy-listing-read.md",
        "线上事实",
        "内部目录",
        "只读",
    )
    failures += require(
        "shared/tools-architecture.md",
        "Etsy Listing 公开读取",
        "Etsy Listing 后台读取",
        "自动巡检已暂停",
    )
    failures += require(
        "README.md",
        "读取 / 分析 / 优化现有 Etsy Listing",
        "v1.0.12",
    )
    manifest = (ROOT / "etsy-stack.json").read_text(encoding="utf-8")
    if "listing-reader" in manifest or "etsy-listing-read" in manifest:
        failures.append("etsy-stack.json: must not add a top-level Listing reader skill")
    if failures:
        print("listing-read-contract: FAIL", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1
    print("listing-read-contract: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
