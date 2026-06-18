---
name: etsy-listing-seo-optimization
description: Use when optimizing FuBlessings Etsy listing titles, descriptions, tags, and SEO keyword fields for buyer search intent after the product facts and draft listing already exist. Focuses on high-traffic buyer terms, title weighting, tag-slot hygiene, and safe Product Base updates.
layer: application
---

# Etsy Listing SEO Optimization

Use this skill when the user asks to improve Etsy search traffic for an existing FuBlessings listing, especially title / description / tags / SEO keywords.

This complements `listing-catalog` (full listing drafting) and `etsy-live-listing-audit` (post-publish QA). It is narrower than a full listing rewrite: keep product facts, policy language, and brand voice stable unless the user asks for a full rewrite.

## Core rule: title weight is for high-traffic search terms

Etsy title weight is strongest near the front. Do **not** spend title space on specification-only terms unless they are proven high-intent queries.

- Usually keep out of title: exact dimensions such as `7 x 21 cm`, `size`, `dimensions`, SKU-like variant wording.
- Put those in: Description `Specifications`, size chart image, alt text if visible.
- Put in title instead: `personalized`, `custom`, `handmade`, core product noun, buyer/audience gift phrase.

For bookmarks, prefer high-intent phrases such as:

- `Personalized Chinese Calligraphy Bookmark`
- `Custom Tassel Bookmark`
- `Book Lover Gift`
- `Reader Gift`
- `Handmade Bookmark`
- `Custom Name Gift`

## Workflow

1. Read the current Product Base row and relevant `BRAND.md` / `SHOP.md` anchors.
2. Inspect current `Title (EN)`, `Tags`, `SEO 关键词`, and first 2 paragraphs of `Description (EN)`.
3. Optional: use web/search/eRank-style snippets for directional buyer phrase anchors, but label them as directional unless full eRank research was done.
4. Draft a compact SEO replacement set:
   - Title ≤ 140 chars; strongest phrases in the first 60–70 chars.
   - Tags = exactly 13; each tag ≤ 20 chars.
   - SEO keywords can include longer phrases separated by semicolon.
   - Description first 1–2 paragraphs naturally include the strongest phrases without keyword stuffing.
5. Validate mechanically before writing:
   - title length ≤ 140;
   - no unwanted size/spec terms in title when user asked to avoid them;
   - exactly 13 tags;
   - every tag ≤ 20 chars.
6. If the user says “更新”, update only the confirmed SEO fields unless they explicitly ask for more:
   - `Title (EN)`
   - `Tags`
   - `SEO 关键词`
   - `Description (EN)`
7. Re-read the record and report verification.

## Product Base update pattern with lark-cli

For `lark-cli base +record-batch-update`, use the `record_id_list` + `patch` shape, not OpenAPI-style `records[]`:

```json
{
  "record_id_list": ["recXXXX"],
  "patch": {
    "Title (EN)": "...",
    "Tags": "...",
    "SEO 关键词": "...",
    "Description (EN)": "..."
  }
}
```

Then re-read the record and verify the changed fields. Do not report success only from the write response.

## Bookmark example pattern

For a personalized Chinese calligraphy bookmark, a strong SEO title can be:

```text
Personalized Chinese Calligraphy Bookmark, Custom Tassel Bookmark, Book Lover Gift, Handmade Reader Gift
```

Example tag set:

```text
chinese bookmark,custom bookmark,bookmark with tassel,book lover gift,reader gift,personalized gift,custom name gift,teacher gift,graduation gift,fathers day gift,handmade bookmark,calligraphy gift,chinese calligraphy
```

If the listing is not intentionally seasonal, replace seasonal tags like `fathers day gift` with evergreen buyer phrases such as `gift for booklover`.

## Pitfalls

- Do not blindly preserve dimensions in title just because dimensions are important to buyers. Important buyer information belongs in specs; high-traffic search intent belongs in title.
- Do not use weak tags like a raw material term (`xuan paper`) when a stronger buyer-intent phrase fits the product and remains truthful.
- Do not exceed 20 characters per tag; Etsy truncates/rejects long tags.
- Do not stuff keywords in description so heavily that FuBlessings stops sounding like a refined calligraphy gift studio.
- Do not change price, inventory, images, status, or listing links during an SEO-only update unless the user explicitly asks.
