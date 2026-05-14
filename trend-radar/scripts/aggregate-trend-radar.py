#!/usr/bin/env python3
"""Aggregate trend-radar raw evidence into report + machine JSON."""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Aggregate Trend Radar evidence")
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--google-dir", required=True)
    parser.add_argument("--exolyt-dir", required=True)
    parser.add_argument("--out-report", required=True)
    parser.add_argument("--out-json", required=True)
    return parser.parse_args()


def read_json(path: Path) -> Any | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
    except json.JSONDecodeError:
        return None


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:60] or "signal"


def canonical(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower().lstrip("#"))


def add_signal(candidates: dict[str, dict[str, Any]], label: str, signal: dict[str, Any], *, bucket: str, why: str) -> None:
    key = canonical(label)
    if not key:
        return
    existing = candidates.get(key)
    if not existing:
        existing = {
            "id": "",
            "label": label,
            "bucket": bucket,
            "verification_status": "weak",
            "sources": [],
            "signals": [],
            "related_terms": [],
            "why_it_matters": why,
            "risk_hint": "",
            "notes": "",
        }
        candidates[key] = existing
    elif bucket == "rising" and existing["bucket"] != "rising":
        existing["bucket"] = "rising"
        existing["why_it_matters"] = why

    source = signal.get("source", "")
    if source and source not in existing["sources"]:
        existing["sources"].append(source)
    existing["signals"].append(signal)
    if label != existing["label"] and label not in existing["related_terms"]:
        existing["related_terms"].append(label)


def aggregate_google(candidates: dict[str, dict[str, Any]], google_dir: Path, failures: list[dict[str, str]], sources: set[str]) -> None:
    summary = read_json(google_dir / "google-trends-summary.json")
    if not summary:
        failures.append({"source": "google_trends_browser", "reason": "missing_google_summary"})
        return

    sources.add("google_trends_browser")
    for result in summary.get("results", []):
        for failure in result.get("failures", []) or []:
            failures.append({"source": f"google_trends_browser:{result.get('window', '')}", "reason": failure})
        for item in result.get("normalized", []) or []:
            label = item.get("label", "")
            signal_type = item.get("signal_type", "")
            bucket = "rising" if signal_type.endswith("_rising") else "watch"
            why = (
                "Google Trends returned this as a rising related signal for Chinese."
                if bucket == "rising"
                else "Google Trends returned this as a related signal for Chinese; keep it on watch unless it repeats or cross-validates."
            )
            evidence = item.get("link") or result.get("page_url") or str(google_dir)
            add_signal(
                candidates,
                label,
                {
                    "source": "google_trends_browser",
                    "window": item.get("window", result.get("window", "")),
                    "signal_type": signal_type,
                    "growth": str(item.get("growth", "")),
                    "evidence": evidence,
                },
                bucket=bucket,
                why=why,
            )


def aggregate_exolyt(candidates: dict[str, dict[str, Any]], exolyt_dir: Path, failures: list[dict[str, str]], sources: set[str]) -> None:
    payload = read_json(exolyt_dir / "exolyt-browser.json")
    if not payload:
        failures.append({"source": "exolyt_browser", "reason": "missing_exolyt_output"})
        return

    status = payload.get("status", "")
    if status == "login_required":
        failures.append({"source": "exolyt_browser", "reason": "login_required"})
        return

    sources.add("exolyt_browser")
    for term in payload.get("extracted_terms", []) or []:
        add_signal(
            candidates,
            term,
            {
                "source": "exolyt_browser",
                "window": "",
                "signal_type": "exolyt_extracted_term",
                "growth": "",
                "evidence": payload.get("page_url") or str(exolyt_dir / "exolyt-browser.json"),
            },
            bucket="watch",
            why="Exolyt exposed this term from the Chinese/#chinese TikTok research page; verify growth before promoting to Rising.",
        )


def walk_serpapi_items(value: Any) -> list[dict[str, str]]:
    found = []
    if isinstance(value, dict):
        label = value.get("query") or value.get("title") or value.get("topic_title")
        if label:
            found.append(
                {
                    "label": str(label),
                    "growth": str(value.get("value") or value.get("formattedValue") or value.get("extracted_value") or ""),
                    "link": str(value.get("link") or ""),
                }
            )
        for child in value.values():
            found.extend(walk_serpapi_items(child))
    elif isinstance(value, list):
        for child in value:
            found.extend(walk_serpapi_items(child))
    return found


def aggregate_serpapi(candidates: dict[str, dict[str, Any]], google_dir: Path, sources: set[str]) -> None:
    serpapi_dir = google_dir / "serpapi"
    if not serpapi_dir.exists():
        return
    for raw_path in sorted(serpapi_dir.glob("*.json")):
        payload = read_json(raw_path)
        if not payload:
            continue
        sources.add("serpapi_google_trends")
        for item in walk_serpapi_items(payload):
            label = item.get("label", "")
            if not label or label.lower() == "chinese":
                continue
            add_signal(
                candidates,
                label,
                {
                    "source": "serpapi_google_trends",
                    "window": "",
                    "signal_type": "serpapi_related",
                    "growth": item.get("growth", ""),
                    "evidence": item.get("link") or str(raw_path),
                },
                bucket="watch",
                why="SerpApi Google Trends fallback returned this as a related signal for Chinese.",
            )


def finalize_candidates(candidates: dict[str, dict[str, Any]], run_id: str) -> list[dict[str, Any]]:
    finalized = []
    for key, item in candidates.items():
        source_set = set(item["sources"])
        if "google_trends_browser" in source_set and "exolyt_browser" in source_set:
            item["verification_status"] = "confirmed"
            if item["bucket"] != "rising":
                item["bucket"] = "watch"
        elif "google_trends_browser" in source_set or "serpapi_google_trends" in source_set:
            item["verification_status"] = "search_led"
        elif "exolyt_browser" in source_set:
            item["verification_status"] = "social_led"
        else:
            item["verification_status"] = "weak"
        item["id"] = f"{run_id}-{slugify(item['label'])}"
        finalized.append(item)

    order = {"rising": 0, "watch": 1, "ignore": 2}
    return sorted(finalized, key=lambda x: (order.get(x["bucket"], 9), x["label"].lower()))


def render_items(items: list[dict[str, Any]]) -> str:
    if not items:
        return "- None"
    lines = []
    for index, item in enumerate(items, 1):
        signal_bits = []
        for signal in item.get("signals", [])[:3]:
            growth = f", growth={signal.get('growth')}" if signal.get("growth") else ""
            signal_bits.append(f"{signal.get('source')}:{signal.get('signal_type')}{growth}")
        lines.append(
            f"{index}. {item['label']}\n"
            f"   - Bucket: {item['bucket']} / {item['verification_status']}\n"
            f"   - Signals: {'; '.join(signal_bits) or 'n/a'}\n"
            f"   - Why: {item['why_it_matters']}"
        )
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    google_dir = Path(args.google_dir)
    exolyt_dir = Path(args.exolyt_dir)
    out_json = Path(args.out_json)
    out_report = Path(args.out_report)

    candidates: dict[str, dict[str, Any]] = {}
    failures: list[dict[str, str]] = []
    sources: set[str] = set()

    aggregate_google(candidates, google_dir, failures, sources)
    aggregate_serpapi(candidates, google_dir, sources)
    aggregate_exolyt(candidates, exolyt_dir, failures, sources)

    finalized = finalize_candidates(candidates, args.run_id)
    rising = [c for c in finalized if c["bucket"] == "rising"]
    watch = [c for c in finalized if c["bucket"] == "watch"]
    ignore = [c for c in finalized if c["bucket"] == "ignore"]

    payload = {
        "run_date": args.run_id,
        "keyword": "Chinese",
        "geo": "US",
        "windows": ["7d", "30d"],
        "sources_used": sorted(sources),
        "source_failures": failures,
        "candidates": finalized,
    }

    raw_evidence = "\n".join(
        [
            f"- Google Trends raw: {google_dir}",
            f"- Exolyt raw: {exolyt_dir}",
            f"- Generated at: {datetime.now(timezone.utc).isoformat()}",
        ]
    )
    report = (
        "# Trend Radar Report\n\n"
        f"日期：{args.run_id}\n"
        "关键词：Chinese\n"
        "市场：US\n"
        "窗口：7d + 30d\n"
        f"数据源：{', '.join(sorted(sources)) or 'none'}\n\n"
        "## Summary\n\n"
        f"- Rising：{len(rising)}\n"
        f"- Watch：{len(watch)}\n"
        f"- Ignore：{len(ignore)}\n"
        f"- Source failures：{json.dumps(failures, ensure_ascii=False)}\n\n"
        "## Rising Signals\n\n"
        f"{render_items(rising)}\n\n"
        "## Watch\n\n"
        f"{render_items(watch)}\n\n"
        "## Ignore / Noise\n\n"
        f"{render_items(ignore)}\n\n"
        "## Raw Evidence\n\n"
        f"{raw_evidence}\n\n"
        "## Next Search Notes\n\n"
        "- Re-run next week with the same keyword and market. Promote a signal only when it repeats, accelerates, or cross-validates.\n"
    )

    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_report.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    out_report.write_text(report, encoding="utf-8")
    print(str(out_report))
    print(str(out_json))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
