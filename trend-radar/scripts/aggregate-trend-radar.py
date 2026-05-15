#!/usr/bin/env python3
"""Aggregate trend-radar raw evidence into report + machine JSON."""

from __future__ import annotations

import argparse
import json
import re
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


def enrich_label(label: str) -> dict[str, Any]:
    """Add buyer-readable interpretation for a raw trend phrase.

    This is intentionally heuristic. It should make the weekly report readable
    without pretending to know things the data source did not prove.
    """

    normalized = label.lower().lstrip("#")
    compact = canonical(label)

    def result(
        meaning: str,
        intent: str,
        fit: str,
        fit_level: str,
        suggested: list[str],
        next_step: str,
    ) -> dict[str, Any]:
        return {
            "meaning_zh": meaning,
            "user_intent_zh": intent,
            "calligraphy_fit_zh": fit,
            "fit_level": fit_level,
            "suggested_chinese_text": suggested,
            "next_step_zh": next_step,
        }

    if any(term in normalized for term in ["near me", "restaurant", "buffet", "takeout", "delivery", "menu", "food"]):
        return result(
            "和中餐、附近餐馆、外卖或菜单相关的搜索需求。",
            "用户大概率是在找吃饭地点、外卖、菜单或附近服务，需求偏即时消费。",
            "和书法周边的直接转化弱。可作为内容噪音处理；如果要蹭，只适合做餐厅/厨房/宴请场景的礼物语境，不适合主推。",
            "low",
            ["福", "味", "家宴", "有福"],
            "除非它连续多周升温，或和节日/家庭聚会一起出现，否则放入 Ignore 或低优先 Watch。",
        )

    if any(term in normalized for term in ["translate", "translation", "english to chinese", "chinese to english", "dictionary"]):
        return result(
            "和中文翻译、英文转中文、中文转英文或词义查询相关。",
            "用户想理解中文、翻译短语，或确认某个中文字/句子的含义，常见于纹身、礼物刻字、名字翻译、社媒文案。",
            "结合度高。它说明海外用户需要“看懂中文含义”，可以做解释型内容：每个汉字的含义、适合送谁、能不能用于定制。",
            "high",
            ["福", "爱", "和", "静", "勇", "安"],
            "优先把这类词交给内容层做“Chinese character meaning”解释页或短视频，不急着做新 SKU。",
        )

    if any(term in normalized for term in ["zodiac", "horoscope", "calendar", "new year", "lunar", "animal"]):
        return result(
            "和中国生肖、农历、中国新年或节庆时间相关。",
            "用户想知道自己的生肖、年份寓意、节日日期，或找节庆礼物和祝福语。",
            "结合度高。适合做生肖字、春节祝福、年份礼物、出生年定制。书法媒介天然适合把生肖和祝福浓缩成几个字。",
            "high",
            ["福", "春", "吉", "生肖", "龙", "马", "蛇"],
            "优先进入下一步评估。需要按当年生肖和目标节日拆内容，不要泛泛讲中国文化。",
        )

    if any(term in normalized for term in ["dragon", "loong"]):
        return result(
            "和中国龙、龙年、力量/好运象征相关。",
            "用户可能在找龙的文化含义、龙年礼物、纹身灵感，或东方神话审美。",
            "结合度高。适合做单字“龙”、成语“龙腾”、祝福“瑞龙”。要避开具体影视/游戏 IP，只走公共文化象征。",
            "high",
            ["龙", "龙腾", "瑞龙", "腾", "勇"],
            "进入下一步评估。重点检查是否来自公共文化搜索，还是某个商业 IP 带动。",
        )

    if any(term in normalized for term in ["tea", "matcha", "wellness", "meditation", "zen", "feng shui"]):
        return result(
            "和中式茶、养生、禅意、风水或慢生活审美相关。",
            "用户在找一种东方生活方式：安静、养生、空间氛围、仪式感，而不只是买一个具体物品。",
            "结合度中高。适合书签、桌面小卷轴、吊坠等“安静提醒物”。文案要克制，不要做玄学承诺。",
            "medium",
            ["茶", "静", "和", "安", "禅"],
            "适合进入 Watch。若同时在 TikTok/Exolyt 出现，可以升级为 lifestyle 内容方向。",
        )

    if any(term in normalized for term in ["tattoo", "symbol", "character", "word", "meaning", "name"]):
        return result(
            "和中文字、符号含义、名字或纹身灵感相关。",
            "用户想找一个“看起来美、含义对、能代表自己”的中文字或短语。",
            "结合度很高。这几乎就是书法定制的需求原型：选择一个字，解释含义，用手写艺术承载身份和祝福。",
            "high",
            ["福", "爱", "勇", "静", "自由", "平安"],
            "优先进入下一步评估。需要做含义解释、误用提醒和定制入口。",
        )

    if any(term in normalized for term in ["wukong", "monkey king", "journey to the west", "nezha", "mulan"]):
        return result(
            "和中国神话、古典故事或海外熟悉的中国角色相关。",
            "用户可能在找故事背景、角色含义、东方神话审美或相关礼物灵感。",
            "结合度高但要小心 IP。不要用商业作品名做商品标题；可以转到公共领域文化字词和寓意。",
            "medium",
            ["悟", "空", "道", "命", "勇", "自在"],
            "进入下一步评估时必须做 IP 风险检查，只保留公共领域表达。",
        )

    if any(term in normalized for term in ["dress", "hanfu", "qipao", "cheongsam", "makeup", "aesthetic", "baddie"]):
        return result(
            "和中式穿搭、妆容、审美身份或社媒风格相关。",
            "用户在找可展示的身份符号：穿搭、配饰、头像、拍照道具、社媒标签。",
            "结合度中高。更适合吊坠、小挂件、拍照道具和短内容，不一定适合传统书签。",
            "medium",
            ["美", "静", "和", "福", "自在"],
            "适合交叉验证 TikTok。若 Exolyt 也出现，优先做社媒内容而不是直接上新。",
        )

    if compact in {"china", "chinese"}:
        return result(
            "过于宽泛的中国/中文相关搜索。",
            "用户需求不明确，可能是新闻、语言、文化、旅行、餐饮等混合需求。",
            "不能直接转成产品。它只能作为母关键词，不应进入商品或内容选题。",
            "low",
            [],
            "继续观察其 related queries，不直接使用这个词做行动。",
        )

    return result(
        "暂时只能确认它是 Google Trends 或 Exolyt 返回的 Chinese 相关原始信号，具体语义需要二次搜索确认。",
        "用户需求未知。可能是搜索、社媒梗、人物/地点/品牌名，不能只凭词面判断。",
        "暂不直接结合书法周边。先查这个词在搜索结果、TikTok 视频或新闻里的真实语境，再决定是否进入机会评估。",
        "unknown",
        [],
        "下一步用这个原始词做人工/自动二次搜索，补充语境后再判断。",
    )


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
            **enrich_label(label),
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
        if item.get("fit_level") == "low" and item["bucket"] == "rising":
            item["notes"] = (item.get("notes", "") + " Low product fit despite trend signal.").strip()
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
            f"   - Meaning: {item.get('meaning_zh', '')}\n"
            f"   - User need: {item.get('user_intent_zh', '')}\n"
            f"   - Calligraphy fit: {item.get('calligraphy_fit_zh', '')}\n"
            f"   - Suggested text: {', '.join(item.get('suggested_chinese_text', [])) or 'None'}\n"
            f"   - Next: {item.get('next_step_zh', '')}"
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
