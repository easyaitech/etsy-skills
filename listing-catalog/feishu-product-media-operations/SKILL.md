---
name: feishu-product-media-operations
description: Use when updating FuBlessings Product Base media fields or Feishu Drive listing-photo assets, especially when adding, replacing, ordering, or verifying Etsy listing images through lark-cli.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [etsy, feishu, lark, product-base, listing-photos, media]
    related_skills: [listing-catalog, etsy-listing-photo-intake, assets-library, etsy-shop-merchandising]
---

# Feishu Product Media Operations

## Overview

This skill captures Feishu/Lark operational details for FuBlessings product media: Drive asset backup, Product Base attachments, listing-photo replacement semantics, and verification. Use it as a support skill with `etsy-listing-photo-intake`, `assets-library`, and `listing-catalog` whenever the task touches `照片附件`, `照片链接`, or Etsy listing image order.

## When to Use

Use when:

- Adding chat-uploaded images to a SKU's listing photo set.
- Replacing a redundant listing image, such as two similar green bookmark photos.
- Uploading sanitized publishing copies to Feishu Drive and Product Base.
- Verifying attachment counts, Drive backup, image order notes, alt text, or metadata-cleaning notes.

## Workflow

1. Read the current SKU row before changing media fields.
2. Inspect existing image names/roles, not only attachment count.
3. Preserve raw chat uploads; create sanitized publishing copies inside the ETSY workspace.
4. Upload/confirm the publishing copy in the Feishu Drive asset library, usually under `FuBlessings-素材库 / 商品` for listing-ready product images.
5. Attach the publishing copy to the Product Base only after Drive backup/promote is handled or explicitly blocked.
6. Update `照片链接` and notes with the intended Etsy image order, differentiated alt text, and sanitization status.
7. Re-query the row and verify expected attachment count, filenames, and notes.

## Replacement Semantics

When the user asks to replace a similar existing image:

- Do not simply append and report success.
- Identify which existing image is redundant by color, scene, angle, crop, and buyer-information value.
- If the Base attachment field cannot delete/reorder attachments, append the new file but update `照片链接` and notes so the intended Etsy order omits or marks the old image as superseded.
- In the user-facing reply, say the intended Etsy listing order/replacement instruction was written; do not claim the physical attachment field was reordered or deleted unless verified.

## Known CLI / API Pitfalls

- `lark-cli drive +upload` and `lark-cli base +record-upload-attachment` require `--file` to be a relative path inside the current working directory. Passing an absolute path fails with `unsafe file path`.
- `lark-cli base +record-upload-attachment` can append to `照片附件`.
- `record-batch-update` cannot directly write/reorder/delete attachment fields; attachment fields behave as read-only through the current OpenAPI path.
- Therefore, use `照片链接` plus notes / image-order text as the source of truth for Etsy ordering when physical Base attachment order cannot be controlled.
- Never expose Base tokens, table IDs, record IDs, file tokens, folder tokens, file URLs, credentials, cookies, or API keys in user-facing output.

## Verification Checklist

- [ ] Raw upload unchanged.
- [ ] Publishing copy created under `.cache/ai-image-sanitizer/<SKU>-<YYYYMMDD>/`.
- [ ] Metadata/provenance marker scan completed for publishing copy.
- [ ] Feishu Drive asset backup/promote completed or blocker recorded.
- [ ] Product Base `照片附件` contains the new file when attachment upload is required.
- [ ] `照片链接` and notes state intended Etsy order and any superseded/replaced image.
- [ ] Reply avoids leaking Feishu tokens/URLs and avoids overclaiming physical reorder/delete behavior.
