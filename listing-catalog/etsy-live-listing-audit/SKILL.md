---
name: etsy-live-listing-audit
description: "Audit already-published Etsy listings for FuBlessings: public-page settings, buyer-facing copy, images/video, personalization, policies, materials, category, and backend fields that still need confirmation."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [etsy, listing-audit, fublessings, merchandising, compliance]
    related_skills: [listing-catalog, etsy-shop-merchandising, pricing-strategy]
---

# Etsy Live Listing Audit

## Overview

Use this skill when a FuBlessings Etsy listing is already live and the user asks whether the setup has problems. It is not for drafting a new listing from scratch; use `listing-catalog` for that. This skill focuses on post-publish QA: what buyers can see, what looks unfinished, what conflicts with shop policy, and which backend-only fields need confirmation.

## When to Use

Load this skill when the user says things like:

- “已经上架了，检查一下所有信息有没有问题”
- “这个 Etsy listing live 了，帮我 review 一下”
- “看看标题/图片/价格/个性化/退换货设置有没有问题”
- “检查这个 listing 页面是否专业 / 是否有风险”

Also load `listing-catalog` for copy/SEO fields, `etsy-shop-merchandising` for image order and presentation, and `pricing-strategy` if price is part of the audit.

## Required Context

Before judging the listing, read or retrieve:

1. `<workspace>/BRAND.md` — brand positioning, prohibited language, Lina attribution.
2. `<workspace>/SHOP.md` — shipping, processing, custom-order and returns policy anchors.
3. Relevant SKU draft / listing draft / pricing notes in the workspace, if available.
4. Public Etsy listing page or other accessible public data.

## Public Page Retrieval Fallbacks

Etsy often blocks plain HTTP, generic extractors, or reader proxies with 403, CAPTCHA, or JS-required pages. Use this fallback order:

1. Try public URL extraction if it works.
2. If blocked, search workspace notes/drafts for the SKU and listing ID.
3. If a local authorized Chrome with remote debugging is already available, inspect the listing through Chrome DevTools Protocol.
4. If backend fields cannot be reached, state that clearly instead of guessing.

Security rule: DevTools output may contain cookies, csrf, nonce, uaid, request headers, internal URLs, or session metadata. Never paste these into user replies, Markdown reports, summaries, or memory.

## Audit Checklist

### Buyer-facing publish readiness

- No draft leftovers: `TBD`, `TODO`, `please confirm`, `before publishing`, unknown dimensions, unknown price, placeholder image notes.
- Title length is within Etsy limit; core product keyword appears early.
- Category matches actual product type.
- Price is intended, or local tax/currency/region differences are noted.
- Description matches actual package contents, dimensions, processing time, shipping, and returns.
- Materials include the true functional components buyers care about.
- Photos and videos are present, ordered logically, and not overly redundant.
- Variations match any style chart and are understandable.
- Personalization field is required when needed, has a clear English prompt, and its character limit matches the description promise.

### Policy consistency

- Public Etsy policy display and description must agree on returns/exchanges.
- For personalized/custom pieces, avoid conflicting language such as “30-day returns accepted” on the page and “returns usually not accepted” in the description unless the distinction is explicitly handled.
- Shipping origin, processing time, delivery estimate, and free-shipping claims must align with SHOP.md.

### FuBlessings brand / compliance

- Use `Artist Lina Sun` or `Calligrapher Lina Sun`; do not use `Master`.
- Do not imply FuBlessings is a one-person studio.
- Do not use efficacy verbs such as `brings`, `attracts`, `removes`, `wards off`.
- Do not present calligraphy, 福, blessings, or Chinese characters as feng shui cures, religious objects, spells, talismans, or guaranteed luck/wealth/health/love results.
- Sustainability / Occasion / Holiday should only be filled when they truly match Etsy backend definitions; generic gift suitability is not enough.

### Product-specific presentation notes

For magnets:

- Buyers should quickly understand it is a real magnet, not a paper card or sticker.
- Show the item on a magnetic surface in the main image or early image set.
- Put front/back or magnetic-backing proof early, ideally image 2 or 3.
- Include `magnetic backing` in materials when true.

For bookmarks:

- If adding a new photo and two existing images are visually similar, replace the redundant one rather than only appending.
- Preserve variety across colorway, use context, craft/process proof, personalization instructions, and gift/lifestyle scenes.

## Backend Fields That Often Need Explicit Confirmation

If not directly visible, list these under `后台仍需确认`:

- Tags and whether all 13 slots are used well.
- Backend SKU.
- Inventory and quantity.
- Processing profile and shipping profile.
- Personalization required toggle and max character count.
- Sustainability / Occasion / Holiday selections.
- Exact dimensions, weight, thickness, and package size.
- Whether props or packaging shown in photos are included.

## Output Format

Reply in Chinese unless asked otherwise. Keep it direct:

1. `总体结论` — can stay live / needs immediate fixes / serious issue.
2. `必须尽快修正` — high-impact issues only.
3. `建议优化` — conversion, clarity, merchandising improvements.
4. `后台仍需确认` — only if applicable.
5. Mention any saved audit file path, but never include secrets or internal tokens.

Prefer concise judgment over a long re-draft. The user asked for QA, not a full rewrite, unless they request edits.

## Report Storage

When the audit is non-trivial, save a Markdown record under:

```text
<workspace>/output/listing-audit/YYYY-MM-DD_<SKU>-etsy-live-listing-audit.md
```

The report may include public listing facts, problems found, and recommendations. It must not include Feishu Base tokens, table IDs, record IDs, folder/file tokens, Etsy cookies, csrf/nonce values, API keys, or internal debugging URLs.
