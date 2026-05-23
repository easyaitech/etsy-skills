---
name: fublessings-media-operations
description: Manage FuBlessings listing-ready product media across chat uploads, local raw backups, sanitized publishing copies, Feishu Drive asset library, and Product Base media fields for Etsy listing images/videos.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [etsy, fublessings, feishu, lark, product-base, listing-media, images, videos]
    related_skills: [listing-catalog, etsy-listing-photo-intake, assets-library, etsy-shop-merchandising]
---

# FuBlessings Media Operations

## When to Use

Use this skill when the task involves FuBlessings listing media, including:

- Adding chat-uploaded photos or videos to an Etsy listing candidate.
- Replacing a redundant listing photo while preserving intended Etsy order.
- Backing up media to `FuBlessings-素材库` before writing Base records.
- Creating sanitized publishing copies for listing photos or videos.
- Updating Product Base media fields such as `照片附件`, `照片链接`, `视频附件`, `视频链接`, and `备注`.
- Verifying Drive backup, Product Base references, attachment counts, and user-facing claims.

## Core Principles

1. Work inside the ETSY workspace; keep raw uploads unchanged.
2. Chat-uploaded media must be backed up/promoted to the Feishu Drive asset library before it is treated as listing-ready.
3. Product Base records are operational source records, not a substitute for Etsy backend upload. Do not claim Etsy was updated unless the user explicitly handled/confirmed Etsy backend changes.
4. Do not leak Feishu Base tokens, table IDs, record IDs, field IDs, folder/file tokens, file URLs, log IDs, cookies, API keys, or passwords in user-facing output.
5. For physical attachment fields, verify by re-reading the row. Never infer success from an attempted upload command alone.

## Standard Workflow

1. Identify target SKU/listing and read the current Product Base row before editing.
2. Preserve the raw upload in a SKU-scoped local raw folder.
3. Create a publishing copy under a workspace cache/output path.
4. Sanitize metadata/provenance markers before listing use.
5. Upload/promote the publishing copy to `FuBlessings-素材库 / 商品` unless the task clearly belongs in another asset folder.
6. Update Product Base:
   - Images: use `照片附件` when upload succeeds; write `照片链接` and `备注` for intended Etsy order, alt text, replacement semantics, and sanitization status.
   - Videos: use `视频链接` as the stable source of truth; use `视频附件` only when MP4 attachment upload is verified.
7. Re-query Drive/Base to verify the file, fields, attachment counts, and notes.
8. Reply concisely with what was updated, what could not be verified, and what the user still needs to do in Etsy backend.

## Replacement Semantics for Similar Photos

When the user asks to replace a similar existing image:

- Do not simply append and call it replaced.
- Compare buyer value: color, angle, scene, crop, detail clarity, and whether the image answers a distinct buyer question.
- If Base attachment deletion/reordering is unavailable, append the new file but write `照片链接` / `备注` so the intended Etsy order omits or marks the old file as superseded.
- In the final reply, say the intended replacement/order was written; do not claim a physical attachment was deleted or reordered unless verified.

## Video Field Pattern

When Product Base lacks video columns, add both:

- `视频链接`: text/link field. Stable source of truth for the Feishu Drive video publishing copy.
- `视频附件`: attachment field. Future/optional storage only; current OpenAPI paths may fail for MP4.

Known issue: `lark-cli base +record-upload-attachment` can return `upload media failed: [1061001] unknown error.` for MP4, including when retried by field ID. If this happens, upload to Drive, write the file link into `视频链接`, and record the limitation in `备注`. Do not tell the user the MP4 is attached unless a row re-read confirms `视频附件` count increased.

See `references/video-media-fields.md` for the detailed MP4 handling pattern.

## Metadata Sanitization Notes

- For images, strip EXIF/XMP/provenance markers in the publishing copy.
- For videos, prefer re-encoding plus metadata removal. A simple `ffmpeg -map_metadata -1 -c copy` may still leave `XMP` bytes.
- Scan publishing copies for marker strings such as `c2pa`, `C2PA`, `OpenAI`, `EXIF`, `Exif`, `XMP`, `xmp`, `prompt`, `Prompt`, `Content Credentials`, and `DALL`.
- This process does not guarantee invisible/pixel-level watermark removal; do not overclaim.

## Etsy Backend Boundary

- Product Base + Feishu Drive updates prepare listing media for Etsy; they do not update Etsy by themselves.
- Etsy listing videos are typically best at 5–15 seconds. If a video is slightly over 15 seconds, mention that Etsy backend may require trimming.
- Final replies should include: Base/Drive updated, any attachment-field limitation, and the specific manual Etsy upload/ordering step remaining.

## Verification Checklist

- [ ] Raw upload preserved unchanged.
- [ ] Publishing copy created and sanitized.
- [ ] Drive asset exists under the intended `FuBlessings-素材库` folder.
- [ ] Product Base media fields exist.
- [ ] Product Base row re-read confirms the values/attachment counts claimed.
- [ ] `备注` records ordering/replacement/sanitization/API limitations when relevant.
- [ ] User-facing reply avoids sensitive IDs/URLs and does not overclaim Etsy backend changes.
