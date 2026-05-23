---
name: etsy-listing-photo-intake
description: Use when the user sends one or more images and says they should become Etsy listing photos, product Base attachments, or listing-ready media for a SKU. Coordinates listing-catalog, assets-library Drive backup, AI metadata sanitization, image ordering, alt text, draft gates, and Feishu/Lark Base verification.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [etsy, listing, photos, feishu, lark, assets, metadata]
    related_skills: [listing-catalog, assets-library, image-synth]
---

# Etsy Listing Photo Intake

## Overview

This skill handles the recurring workflow where the user drops images into chat and says they should be used as Etsy listing pictures. Treat this as a product-media intake task, not as a casual image comment: preserve the raw uploads, back them up to the Feishu/Lark素材库, create sanitized publishing copies, order the images for Etsy, write/update the product Base row, and keep the listing as a draft until launch blockers are resolved.

This skill sits between `listing-catalog` and `assets-library`. `listing-catalog` owns the product row and Etsy SEO fields; `assets-library` owns Drive backup/promote and素材索引 discipline. If both are available, load both before writing Base fields.

## When to Use

Use when:

- User sends images and says “作为 listing 图片”, “用作商品图”, “作为 Etsy 图片”, “冰箱贴/listing 图片”, etc.
- User wants images attached to a Product Base record.
- User wants listing-ready images produced from chat-uploaded or generated images.
- A new SKU needs to be drafted from product photos alone.

Do not use for:

- General image generation from a prompt only — use `image-synth` first.
- Pure素材库 migration with no listing intent — use `assets-library` mode B.
- Pinterest-only posting — use `pinterest-autopin`, but still respect assets-library backup rules.

## Required Context

Before acting:

1. Load `listing-catalog` for Etsy title/description/tags/materials/category rules.
2. Load `assets-library` because all chat images must be backed up to Feishu/Lark Drive素材库; do not only attach them to the Product Base.
3. Read workspace `BRAND.md` and `SHOP.md` if writing or updating listing copy.
4. If relevant, read the SKU row from the Product Base. If no SKU exists and the user gave a clear product class, create a conservative draft SKU row following the workspace’s existing naming pattern.
5. Read `shared/ai-image-sanitization.md` before preparing publishing copies.

## Default Workflow

### 1. Locate and preserve images

- Identify the current chat-uploaded images from the profile cache or provided paths.
- Never modify the raw uploads.
- Make a contact sheet or other quick visual index when there are multiple images and ordering matters.

### 2. Back up / promote through assets-library

- All chat images must be backed up to the Feishu/Lark Drive素材库.
- If the images are final listing/social images, run assets-library B2 promote when possible.
- If ownership or SKU is not yet clear, at minimum use assets-library B1 dump to `待处理/`.
- Do not stop at “uploaded to Product Base attachment” if Drive backup has not happened; record it as blocked if truly impossible.

### 3. Create sanitized publishing copies

Create publishing copies under:

```text
<workspace>/.cache/ai-image-sanitizer/<SKU>-<YYYYMMDD>/
```

Run the shared AI publishing-image sanitization gate:

- Strip EXIF/XMP/C2PA/OpenAI/prompt metadata from publishing copies.
- If `exiftool`, `identify`, or watermark tools are unavailable, use the documented Pillow fallback in `shared/ai-image-sanitization.md` for metadata-only cleaning.
- Verify with a byte/strings scan for markers such as `c2pa`, `C2PA`, `OpenAI`, `EXIF`, `Exif`, `XMP`, `xmp`, `prompt`, `Prompt`, `Content Credentials`, `DALL`.
- Do not run invisible-watermark or broad pixel-level rewriting unless the user explicitly asks and accepts that it can alter calligraphy strokes, product edges, and material texture.

### 4. Order images for Etsy

Use the visible content, not just filenames. A good default order:

1. Hero / use-context image that immediately communicates the product type.
2. Physical proof or detail image: back side, magnet, scale, material, construction.
3. Craft/process image, especially for handwritten calligraphy.
4. Personalization/how-to-order guide.
5. Gift/lifestyle scene.

Adapt by product category, but keep the buyer’s first uncertainty in mind: “what is it?” then “how is it made/used?” then “why gift it?”

### 5. Write listing fields

Follow `listing-catalog` Mode B:

- English Etsy title, description, tags, materials, category suggestion, attributes.
- 13 tags and 13 materials when preparing an Etsy-ready record.
- Differentiated alt text for each image; avoid `Image of...`.
- Keep claims aligned with BRAND.md: no mystical/medical/wealth promises, no false one-person-studio implication, and use the approved artist naming.

If key product facts are missing, proceed with an explicitly marked draft rather than inventing facts.

### 6. Write and verify Product Base

- Create or update the Product Base row.
- Upload sanitized publishing copies as Base attachments after Drive backup/promote is handled or explicitly blocked.
- Put image order, alt text, sanitization notes, and launch blockers in the row notes.
- Verify via `record-get` or equivalent that expected fields and attachment count are present.

## Draft Gates

Keep status as `草稿` if any of these are missing:

- Exact dimensions and thickness.
- Final price.
- Packaging confirmation, especially when packaging appears in the photo or copy.
- A 5–15 second Etsy listing video.
- A precise category option in the Base schema; if unavailable, use the nearest safe value and note the schema gap.

Only move to `待上线` or beyond after the user confirms launch-critical facts.

## Feishu/Lark CLI Notes

Observed quirks in this workspace:

- For Product Base record operations, use `--base-token`; `--app-token` can be an invalid flag in this CLI path.
- `record-search` can fail with validation or rate/permission-like errors (`search_fields` required, `OpenAPISearchRecord limited`). Fall back to `record-list` with local filtering, then `record-get` for final verification.
- Prefer `LARK_CLI_NO_PROXY=1` in this workspace to reduce proxy warnings/noise.
- Never expose base tokens, table IDs, URL tokens, tenant tokens, app secrets, cookies, or upload tokens in the user-facing reply. Use `[REDACTED]` if they must be mentioned.

## Common Pitfalls

1. **Skipping Drive backup because the images were attached to Product Base.** Product Base attachments are not a substitute for the素材库. Run assets-library backup/promote or record why it is blocked.

2. **Editing raw cache images.** Always create publishing copies; raw uploads remain untouched.

3. **Treating metadata cleaning as invisible-watermark removal.** Pillow/exif metadata fallback only removes metadata. It does not prove pixel-level watermark removal.

4. **Publishing from images alone.** Images are enough to create a draft, not enough to launch. Dimensions, price, packaging, and video often remain blockers.

5. **Using identical alt text.** Etsy alt text should distinguish each image’s visible role: use context, back/detail, process, personalization, gift scene.

6. **Leaking tokens in summaries.** Tool outputs often include identifiers; redact credentials and sensitive tokens before replying.

## Verification Checklist

- [ ] Raw images are unchanged.
- [ ] Drive素材库 backup/promote is complete, or blocker is explicitly noted.
- [ ] Publishing copies are in `.cache/ai-image-sanitizer/` with meaningful names.
- [ ] Byte/strings scan shows no AI provenance metadata markers in publishing copies.
- [ ] Product Base row has SKU, status, title, description, 13 tags, 13 materials, SEO keywords, notes, and expected attachment count.
- [ ] Image order and alt text are written to the listing draft/Base notes.
- [ ] User-facing reply states completed work and remaining launch blockers clearly.
