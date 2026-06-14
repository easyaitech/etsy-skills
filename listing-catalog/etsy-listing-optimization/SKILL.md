---
name: etsy-listing-optimization
description: Use when optimizing FuBlessings Etsy listing titles, tags, descriptions, and variant-specific media selection after a product draft or live listing exists. Covers buyer-facing SEO keyword prioritization, keeping dimensions out of title unless strategically needed, selecting images for split size/style listings, and updating Product Base / Pin Queue links after launch.
layer: application
---

# Etsy Listing Optimization

Use this skill when the user asks to review or optimize an existing FuBlessings Etsy listing from the buyer/search perspective, especially:

- “优化 title / tags / description 的关键词”
- “尽量使用流量大的词”
- “尺寸不要放 title 里”
- “新建一个同类但不同尺寸/款式的 listing，选择对应图片”
- “这个 listing 上架了，回填链接并补 Pinterest 队列链接”

This skill complements `listing-catalog`, `etsy-listing-photo-intake`, `etsy-live-listing-audit`, and `pinterest-autopin`. Prefer those existing umbrella skills when available; use this as the operational checklist for SEO + variant-media optimization.

---

## Core SEO rule: title weight is scarce

For FuBlessings Etsy titles, put high-traffic / strong buyer-intent terms in the first 60–70 characters:

- `personalized`
- `custom`
- product noun: `bookmark`, `scroll`, `magnet`, etc.
- craft/value term: `Chinese calligraphy`, `handwritten`, `handmade`, `tassel`
- gift intent: `book lover gift`, `reader gift`, `teacher gift`, `graduation gift`, `fathers day gift`

Avoid using title weight for low-search or spec-only terms unless the user explicitly asks or the dimension is the primary differentiator in search:

- dimensions such as `7 x 21 cm`, `6 x 18 cm`
- `size`, `dimension`
- internal variant identifiers
- material niche terms that buyers are unlikely to search, e.g. `xuan paper` when tag slots are scarce

Dimensions should normally appear in:

1. Description specifications section.
2. Size-reference listing image.
3. Alt text for the size-reference image.
4. Variant / personalization guidance if needed.

Example bookmark title pattern:

```text
Personalized Chinese Calligraphy Bookmark, Custom Red Tassel Bookmark, Book Lover Gift, Handmade Reader Gift
```

---

## Tags: favor buyer searches over internal facts

Use all 13 Etsy tag slots. Each tag must be ≤ 20 characters.

For bookmarks, prioritize combinations like:

```text
chinese bookmark,custom bookmark,bookmark with tassel,book lover gift,reader gift,personalized gift,custom name gift,teacher gift,graduation gift,fathers day gift,red bookmark,calligraphy gift,chinese calligraphy
```

Replace weak or low-intent tags when needed:

- `personal bookmark` → `personalized gift`
- `xuan paper` → keep in Materials/Description; replace with a gift or audience search term
- `brush calligraphy` → `chinese calligraphy` or `calligraphy gift`
- `reading gift` → `reader gift` / `book lover gift`

If a Holiday field is set (e.g. Father’s Day), the tags/description should support it; otherwise leave the Holiday attribute empty or use a less seasonal tag.

---

## Description optimization

Do not keyword-stuff. Natural first two paragraphs should include the main phrases once:

- `personalized Chinese calligraphy bookmark`
- `custom bookmark`
- `book lover gift`
- `handmade bookmark`
- `reader gift`

Keep specifications factual and separate. Use dimensions there, not in the title.

Maintain FuBlessings brand boundaries:

- Use `Artist Lina Sun` or `Calligrapher Lina Sun` for the actual calligraphy work.
- Do not use `Master`.
- Do not imply one-person studio.
- Do not use efficacy verbs like `brings`, `attracts`, `wards off`, `removes`.
- Use `symbolizes`, `represents`, `expresses` for meaning.

---

## Variant split / separate listing image selection

When splitting a previous mixed listing into separate size/style listings, select images strictly from the buyer’s perspective.

For each new listing:

1. Use only images that show the target variant/size.
2. Generic process/personalization images are allowed if they do not show the wrong product variant.
3. Exclude images that show another size/style, even if attractive.
4. Exclude mixed comparison charts unless the comparison is intentionally needed; for a clean separate listing, crop or recreate a target-only size reference.
5. In Product Base remarks, explicitly state which variant is included and which similar variant is excluded.
6. Verify with a contact sheet or visual inspection before writing the Base.

Example: when creating a 6 × 18 cm solid-color red tassel bookmark listing, use red 6 × 18 product photos and a target-only 6 × 18 size reference. Exclude 7 × 21 white-margin/color-panel images and mixed 6 × 18 + 7 × 21 charts unless cropped to target-only.

---

## Launch-link backfill and Pinterest queue link update

When the user says a listing has gone live and provides the Etsy share link:

1. Parse the Etsy Listing ID from `/listing/{id}/...`.
2. Update the Product Base row:
   - `分享链接`
   - `Etsy Listing ID`
   - `状态 = 在售`
   - `上线日 = today`
3. Re-read the Product Base row and verify those fields.
4. Find any previously prepared social/Pinterest draft that was blocked by missing listing link.
5. Create or update the Pin Queue row with the Product Base `分享链接`; do not publish to Pinterest with the shop homepage fallback once a SKU listing URL exists.
6. Verify the Pin Queue row:
   - `Link` is the listing URL
   - image path count matches `图片数量`
   - Alt Text segment count matches image count
   - processed image paths exist if publishing automation will use them
7. Update the local Markdown operation note if one exists, replacing “blocked until listing link” with the actual Pin Queue ID/status.

---

## Product Base write safety

For new or split listings, draft status is safer until launch blockers are confirmed:

- final price
- packaging inclusions
- listing video
- Etsy category/attributes
- personalization prompt
- inventory/quantity
- share link / listing ID after launch

Always re-read after Product Base writes and report the verified result.
