---
name: feishu-listing-media-maintenance
description: Maintain FuBlessings Product Base listing media when Feishu attachment fields, Drive assets, and Etsy-ready source-of-truth fields diverge. Use for splitting listing variants, cleaning old photos from active media, handling read-only `照片附件`, and updating Description/variant/ALT notes after product facts change.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [etsy, feishu, lark, product-base, listing-media, attachment-fields, source-of-truth]
    related_skills: [listing-catalog, etsy-listing-photo-intake, feishu-product-media-operations, listing-media-source-of-truth]
---

# Feishu Listing Media Maintenance

## When to Use

Use this skill when a FuBlessings Etsy listing/media update involves any of these:

- The user wants Product Base / Feishu 多维表格 updated, not Etsy backend automation.
- `照片附件` still shows old/superseded listing images.
- A listing is being split by physical variant, size, style, or SKU.
- A product fact correction affects listing photos, Description, variant/spec text, ALT text, or notes.
- Active Etsy media order must differ from historical Feishu attachment previews.

## Core Source-of-Truth Rule

For Etsy backend upload/order, use this priority:

1. `照片链接` — active listing media order and Drive links.
2. `备注` — current image order, ALT text, replacement/deletion/sanitization notes.
3. `照片附件` — table preview / uploaded evidence only; may retain historical files unless cleaned at field/schema level.

Do not claim `照片附件` was cleaned unless a row re-read confirms the count and filenames.

## Read-Only Attachment Cleanup Pattern

When the user complains old photos still appear in `照片附件`, be active:

1. Re-read the SKU row and list current attachment names versus active `照片链接` names.
2. Attempt a direct `record-batch-update` rewrite of `照片附件` only as a probe.
3. Inspect `ignored_fields`. Feishu can return `ok=true` while saying the attachment field is read-only.
4. Re-read the row. If old files remain, report the exact limitation plainly.
5. Offer a schema-level cleanup when the UI preview must be clean:
   - Rename the existing `照片附件` field to `历史照片附件（勿用）`.
   - Create a new clean attachment field named `照片附件`.
   - Re-upload only the active listing images in `照片链接` order.
   - Re-read and verify the new field count/names.
6. Keep the historical field instead of deleting it unless the user explicitly asks for destructive cleanup.

This schema-level cleanup is a Base structure change; confirm before executing.

## Variant Split Listing Updates

When one listing contains two physical variants and the user wants to split them:

1. Identify which variant remains active and which variant becomes a future separate listing.
2. Update `照片链接` to include only images that match the active variant.
3. Remove mixed-variant photos and size charts from active order if they imply both variants are included.
4. Rewrite `Title (EN)`, `Description (EN)`, `Tags`, `Materials`, `变体`, `SEO 关键词`, and `备注` so they describe only the active variant.
5. In Description and variant/spec notes, explicitly say the excluded variant is not included when that prevents buyer confusion.
6. Keep status as `草稿` or `待上线` according to launch readiness; do not claim Etsy backend was changed.

## Product Fact Corrections

If the user adds a concrete fact after the rewrite — for example, “the back side is plain white with no pattern” — update all relevant fields immediately:

- Description/specifications.
- `变体` or other product-detail field.
- `备注` with a dated clarification.
- Any ALT text or photo-order note if the fact affects visual interpretation.

Verify by re-reading the SKU row and checking the exact phrase/fact is present.

## User-Facing Reporting

Keep replies concise and operational:

- What was updated in Feishu/Base.
- What remains historical/preview-only.
- Whether Etsy backend was not touched.
- Any confirmation needed for schema-level cleanup.

Never expose Feishu Base tokens, table IDs, record IDs, field IDs, file tokens, cookies, API keys, or secrets in user-facing replies.

## Verification Checklist

- [ ] SKU row was read before edits.
- [ ] Active media names in `照片链接` match the intended Etsy order.
- [ ] Notes include current ALT text aligned with active order.
- [ ] Description and variant/spec text exclude non-active variants.
- [ ] Product fact corrections are reflected in Description/variant/notes.
- [ ] Attachment cleanup claims are backed by a post-update row read.
- [ ] If `照片附件` remains historical, final reply says so clearly.
