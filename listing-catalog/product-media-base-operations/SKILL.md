---
name: product-media-base-operations
description: Use when updating FuBlessings Product Base media fields and Feishu Drive listing-ready images/videos, especially when images already live in the Drive `商品/` folder and the user wants Feishu 多维表格 updated rather than Etsy backend automation.
layer: application
---

# Product Media Base Operations

Use this skill for FuBlessings product-media maintenance across Feishu Drive and the Product Base: `照片附件`, `照片链接`, `视频附件`, `视频链接`, and `备注`.

This skill is class-level. It covers recurring listing-media intake/update tasks; it does not operate the Etsy backend unless the user explicitly keeps that in scope and a target listing/login is available.

## Triggers

Use when the user says:

- “商品文件夹新增了图片，放到 listing 里”
- “只需要更新飞书多维表格”
- “更新照片附件 / 照片链接 / listing 图片顺序”
- “新增/替换 Etsy 商品图，但后台我自己处理”

## Standard workflow

1. Identify the target SKU by visual content, filenames, or current Product Base rows.
2. Read the Product Base row before editing: SKU, status, `Etsy Listing ID`, `分享链接`, `照片链接`, `照片附件`, `视频链接`, `备注`.
3. Preserve raw inputs:
   - chat uploads: copy from chat/media cache;
   - files already in Feishu Drive `FuBlessings-素材库 / 商品`: download them first and keep a SKU-scoped raw local backup.
4. Create publishing copies under `.cache/ai-image-sanitizer/<SKU>-<YYYYMMDD>/` with meaningful filenames.
5. Strip metadata/provenance from publishing copies, typically by Pillow re-save for images.
6. Scan publishing copies for marker strings: `C2PA`, `OpenAI`, `EXIF`, `XMP`, `prompt`, `Content Credentials`, `DALL`.
7. Upload/confirm the publishing copies in Feishu Drive `商品/`.
8. Append publishing copies to Product Base `照片附件` when image attachments are required.
9. Update `照片链接` as the active source-of-truth ordering list and update `备注` with order, alt text, sanitization status, and any replacement/append semantics.
10. Re-read the Product Base row and verify the expected values before replying.

## Feishu-only completion mode

If the user clarifies that Etsy backend does not need agent operation and they only want Feishu 多维表格 updated, stop at Drive/Product Base updates.

Do **not** continue asking for:

- Etsy Shop Manager login,
- CAPTCHA resolution,
- Etsy draft/listing URL,
- Etsy Listing ID,
- Etsy API credentials.

Final output should say Feishu Drive/Product Base work is complete. It may include the recommended Etsy order/Alt Text for manual upload, but must not imply the Etsy backend was changed.

## Source of truth rule

Product Base `照片附件` may contain historical or superseded files, and the physical attachment order may not be controllable through the current API.

Therefore:

- Use `照片链接` as the active Etsy image order source of truth.
- Record old/superseded attachment limitations in `备注`.
- If attachment count is higher than active image count, explicitly explain that difference in the user-facing reply.

## User-facing boundary

Never claim “uploaded to Etsy” unless Etsy backend upload was directly performed and verified. For Feishu-only tasks, say “已更新飞书云盘和商品 Base / 多维表格”.

## Overlap

This skill overlaps with `etsy-listing-photo-intake`, `feishu-product-media-operations`, `fublessings-media-operations`, and `listing-media-source-of-truth`. Prefer those when they are patchable/available; use this skill as the class-level fallback for Product Base media updates in FuBlessings.
