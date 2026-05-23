---
name: etsy-shop-merchandising
description: "Use when shaping the Etsy storefront and listing presentation beyond copy: shop sections, small-catalog navigation, product-line grouping, and deciding which listing photos to add/replace for better buyer comprehension and visual diversity."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [etsy, shop, sections, merchandising, listing-photos, fublessings]
    related_skills: [listing-catalog, etsy-listing-photo-intake, assets-library]
---

# Etsy Shop Merchandising

## Overview

This skill covers storefront-level merchandising decisions for FuBlessings: how to organize Etsy shop sections when the catalog is small, how to keep navigation professional without creating empty shelves, and how to decide whether a new listing photo should replace a redundant existing image.

Load this alongside `listing-catalog` for listing/content work, and `etsy-listing-photo-intake` + `assets-library` when images are involved.

## When to Use

Use when the user asks:

- “listing/shop section 怎么设？”
- “现在商品少，要不要设置 section？”
- “这张图加到 listing 图片里，替换一张相似的”
- “店铺首页/商品结构/分类怎么更专业？”
- “这些商品应该怎么分组？”

Do not use this skill as a replacement for writing Etsy title/description/tags; use `listing-catalog` for copy and Base fields.

## FuBlessings Merchandising Principles

- Present FuBlessings as a culturally refined, personalized calligraphy gift studio.
- Group by product form and buyer shopping intent, not by supernatural or results-based claims.
- Avoid section names implying guaranteed effects such as attracting wealth, warding off bad luck, healing, or changing fate.
- Safe language: `Calligraphy`, `Personalized`, `Gifts`, `Wall Art`, `Bookmarks`, `Magnets`, `Blessing`, `Good Wishes`.
- Risky language: `Feng Shui Cure`, `Wealth Attractor`, `Love Spell`, `Protection Talisman`, or any category that promises outcomes.

## Shop Section Strategy

### Early catalog: 1–5 products

Default recommendation: **do not over-classify**.

If the store has only a few products, each section containing one item can make the shop feel empty. Prefer either:

1. No sections yet; let buyers see all items directly.
2. One broad section if Etsy/admin structure benefits from it:
   - `Personalized Calligraphy Gifts`

For the current FuBlessings starter catalog:

- BM-001 bookmark
- MAG-001 magnet
- SCR-001 scroll

Recommended answer:

> 现在可以先不设 section，或者只设一个 `Personalized Calligraphy Gifts`。不建议拆成 Bookmarks / Magnets / Scrolls，因为每类只有 1 个商品，会显得货架太空。

### Growing catalog: around 6–8+ products

Start splitting sections once a section can hold at least 2–3 items, or when buyer navigation is meaningfully improved.

Possible sections:

- `Calligraphy Bookmarks`
- `Calligraphy Wall Scrolls`
- `Calligraphy Magnets`
- `Personalized Gift Sets`
- `Chinese Character Gifts`
- `Blessing & Good Wishes Gifts`

Prefer product-form sections when product lines are clear; use occasion/gift-intent sections only when there are enough SKUs and no compliance risk.

## Listing Photo Replacement Strategy

When the user adds a new photo to an existing listing and says to replace a similar one:

1. Do not blindly append the new image.
2. Compare the existing image set for redundancy:
   - same colorway
   - same scene/background
   - same angle/crop
   - same buyer information value
3. Replace the most redundant near-duplicate, preserving a balanced visual set:
   - hero/use context
   - product detail/material proof
   - craft/process or real handwriting proof
   - personalization/how-to-order
   - gift/lifestyle scene
   - colorway variety
4. For FuBlessings bookmarks, if two green bookmark images are highly similar and a new red bookmark lifestyle photo arrives, replace one green duplicate to improve color diversity and seasonal/gift appeal.
5. Keep raw uploads backed up through `assets-library`; publish only sanitized copies per `etsy-listing-photo-intake`.

## Response Style

- Answer directly in Chinese unless the user asks otherwise.
- Give one recommended setup first, then one or two alternatives.
- Keep it practical; do not over-explain Etsy SEO. Mention only that sections help navigation/professional feel more than core SEO ranking.
- Use English section names because Etsy buyers see them.

## Verification Checklist

- [ ] Section count matches catalog size; no empty-looking over-classification.
- [ ] Section names are buyer-facing English and compliant with FuBlessings brand boundaries.
- [ ] Photo replacement improves diversity rather than just increasing count.
- [ ] Listing photo raw files are preserved and Drive-backed when image work is involved.
- [ ] Sensitive Feishu/Base tokens or internal IDs are not exposed in replies.
