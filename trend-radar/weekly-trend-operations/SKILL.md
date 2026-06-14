---
name: weekly-trend-operations
description: "Use when turning weekly trend-radar / Pinterest / eRank keyword collection into an actionable FuBlessings weekly marketing input: fit report, Pinterest content angles, image directions, SEO suggestions, knowledge insight, Watch/Reject, and next-week actions."
layer: application
---

# Weekly Trend Operations

This skill governs the operational step after trend collection. It is not just a scraper: it converts weekly Pinterest/eRank trend signals into FuBlessings decisions.

Use when the user asks to:

- “每周热点追踪自动跑”
- “把趋势利用好”
- “根据 Pinterest/eRank 热词给本周内容建议”
- “生成趋势分析后的行动计划”

## Positioning

```text
trend source JSONs
  -> fit-report
  -> weekly-action-plan.md
  -> human decision
  -> optional business-knowledge / Pin Queue / image-synth / listing audit follow-up
```

Trend keywords are evidence, not instructions. Hot but off-brand terms should be rejected clearly.

## Default FuBlessings weekly pipeline

1. Collect the same-date trend sources, usually US geo:
   - `trend-fetch pinterest-trends --geo US`
   - `trend-fetch pinterest-chinese --geo US`
   - `trend-fetch erank-trend-buzz --geo US`
   - Optional Google sources only when the user wants broader web demand.
2. Run deterministic fit report:
   - `trend-fetch fit-report --date YYYY-MM-DD --geo US`
   - Do not manually lower `--max-items` unless the user asks; preserve the full collected Top lists.
3. Generate Chinese action plan:
   - `<workspace>/outputs/trend-radar/YYYY-MM-DD/weekly-action-plan.md`
   - `<workspace>/outputs/trend-radar/latest-weekly-action-plan.md`
4. Final reply: concise Chinese summary with paths, data-source counts, top 3 recommendations, and human decisions needed.

## Required action-plan sections

Follow `references/weekly-action-plan.md` for the detailed structure. Minimum required sections:

- 数据源状态
- 趋势总览 split by Pinterest home/aesthetic, Pinterest Chinese/culture, and eRank Etsy demand
- 本周立刻做：最多 3 个 Pinterest 选题
- 商品图 / AI 图方向：最多 2 个
- Listing / SEO 优化方向：最多 1 个
- 知识库沉淀洞察：最多 1 个
- Watch Only：最多 5 个
- Reject / 不做
- 下周动作清单：3–5 条

## Interpretation rules

- FuBlessings brand center: hand-brushed Chinese calligraphy, blessing meaning, meaningful gifts, Chinese aesthetics, and personalization.
- Do not hard-chase unrelated trends like tshirts, press-on nails, phone cases, Pokemon/IP goods, or generic apparel.
- eRank is an Etsy demand signal; use it to validate categories such as `wall art` or `wedding`, not to pivot the shop into unrelated categories.
- Pinterest home/decor terms can inspire visual context (room decor, reading corner, calm bedroom, wall art) without turning the shop into a wallpaper/decor store.
- Pinterest Chinese terms can inspire Chinese aesthetic/culture content; if fewer than 50 rows return, say “当前过滤条件仅返回 N 条” rather than assuming login failure by default.
- If `product-catalog.json` is missing, still produce category/content-level recommendations and mark SKU-level matching skipped.

## Boundaries

- Do not write Pin Queue, Product Base, Asset Pool, or Knowledge Card Base from the weekly trend task unless the user explicitly asks for follow-up execution.
- The weekly action plan proposes actions; it does not automatically create Pins, images, listing edits, or Base rows.
- Knowledge insights should first go to business-knowledge weekly/wiki; only repeated multi-week patterns should be proposed for `BRAND_MARKETING.md` / `MARKETING_PLATFORM.md`.

## Relationship to existing skills

This overlaps with `trend-radar` and `business-knowledge`. Prefer those skills when their write paths are available; this umbrella captures the class-level operational bridge from collected trends to weekly action planning.
