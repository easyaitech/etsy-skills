#!/usr/bin/env python3
"""Validate the LLM-facing Etsy Listing read routing contract."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# 版本号从 CHANGELOG 顶部推导，**不要再硬编码**。
# 为什么：这里原本写死着当期版本号（`"v1.0.14"`），每次发版都得手改一次。v1.0.11 那次漏改，
# 于是 main 上这个校验一直 FAIL——而仓库当时没有任何 CI 会跑它，也就一直没人发现。
# 「每次发版记得改 X」这类要求迟早会漏，能机器推导的就别让人记。
CHANGELOG_VERSION_RE = re.compile(r"^## \[(v\d+\.\d+\.\d+)\]", re.MULTILINE)


def changelog_version() -> str:
    """CHANGELOG.md 顶部那条 `## [vX.Y.Z]` —— 本仓版本号的唯一真源。"""
    text = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    match = CHANGELOG_VERSION_RE.search(text)
    if not match:
        print(
            "listing-read-contract: FAIL\n- CHANGELOG.md: 顶部读不出 `## [vX.Y.Z]` 版本号",
            file=sys.stderr,
        )
        raise SystemExit(1)
    return match.group(1)


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
    version = changelog_version()
    failures += require(
        "README.md",
        "读取 / 分析 / 优化现有 Etsy Listing",
        # 发布口径 = main（见 README §发布与分发）。安装命令必须跟着 main 走。
        "etsy-skills/main/install.sh",
    )
    # 安装 URL 不许再 pin 版本号：tag 停在 v1.0.11，pin 上去就是 404——README 里那条
    # `.../v1.0.14/install.sh` 曾经真的 404 过，而没有任何校验拦得住它。
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    for pinned in sorted(set(re.findall(r"etsy-skills/(v\d+\.\d+\.\d+)/", readme))):
        failures.append(
            f"README.md: 安装 URL 不该 pin 版本号 {pinned}（tag 已停更，pin 上去会 404）"
        )
    manifest = (ROOT / "etsy-stack.json").read_text(encoding="utf-8")
    if "listing-reader" in manifest or "etsy-listing-read" in manifest:
        failures.append("etsy-stack.json: must not add a top-level Listing reader skill")
    if failures:
        print("listing-read-contract: FAIL", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1
    print(f"listing-read-contract: PASS ({version}，版本号取自 CHANGELOG.md 顶部)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
