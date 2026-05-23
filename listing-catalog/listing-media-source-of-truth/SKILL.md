---
name: listing-media-source-of-truth
description: Maintain the active source of truth for FuBlessings Etsy listing media when Feishu Product Base attachments cannot be physically reordered or deleted. Use for listing photo/video deletion, replacement, ordering, ALT text cleanup, and verification across `照片链接`, `视频链接`, `备注`, and historical attachment fields.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [etsy, listing, media, feishu, lark, source-of-truth, alt-text]
    related_skills: [listing-catalog, etsy-listing-photo-intake, feishu-product-media-operations, assets-library]
---

# Listing Media Source of Truth

## Overview

Use this skill when a FuBlessings Etsy listing media task is about **which images/videos are active for Etsy**, not just uploading new files. Feishu/Lark Product Base attachment fields may retain historical files and may be read-only through OpenAPI, so the operational source of truth for Etsy ordering and ALT text is:

1. `照片链接` / `视频链接` for the active media URLs and recommended Etsy order.
2. `备注` for the Image order / Alt Text list, replacement notes, deletion notes, and sanitization status.
3. `照片附件` / historical attachment preview only as evidence of uploaded assets, not as the sole listing truth.

This skill complements `etsy-listing-photo-intake` and `feishu-product-media-operations`.

## When to Use

Use when the user says things like:

- “把这张图加到 listing，替换掉一张相似图”
- “在 listing 里删掉这张图片，ALT 也删掉”
- “这几张图重新排序”
- “附件里还有旧图，为什么？”
- “只保留视频链接，不要视频附件”

## Required Steps

1. **Read the SKU row first.** Identify current `照片附件`, `照片链接`, `视频链接`, and `备注` content.
2. **Infer the target carefully.** Use filename, screenshot content, color, scene, crop, and existing notes. Do not rely only on attachment count.
3. **Update the active source of truth.**
   - Add/remove/reorder entries in `照片链接` or `视频链接`.
   - Update the `Image order / Alt Text` list in `备注`.
   - Add a concise dated replacement/deletion note naming the superseded file when known.
4. **Do not overclaim attachment deletion.** If `照片附件` remains unchanged, explain that it is a historical/preview attachment field and not the Etsy order source.
5. **Verify by re-reading.** Confirm the target is absent/present in the intended active fields and that notes reflect the change.
6. **Etsy backend boundary.** Unless an Etsy automation was explicitly run and verified, tell the user that Etsy backend image deletion/upload/reordering and ALT deletion still need manual action.

## Deletion Semantics

For “delete this listing image and its ALT” requests:

- Remove the image from `照片链接` recommended order if present.
- Remove the corresponding ALT from the current Image order / Alt Text list.
- Add a removal note in `备注` stating that the image is removed from the active listing media source of truth.
- If the file remains in `照片附件`, do **not** delete the Drive asset by default. The user asked to remove it from the listing, not destroy the asset-library backup.
- Final reply should distinguish:
  - active Etsy source-of-truth updated ✅
  - historical attachment may remain because of Feishu/OpenAPI limits ⚠️
  - Etsy backend still needs manual cleanup unless already automated ⚠️

## Replacement Semantics

For “add this and replace one similar image” requests:

- Add the new sanitized publishing copy through the normal intake path.
- Identify the redundant old image by buyer-information value, not just similarity.
- Keep the stronger image in the recommended Etsy order and mark the old image as superseded in `备注`.
- If physical attachment deletion/reorder fails or is read-only, keep using `照片链接` + `备注` as the active order.

## Known Feishu/Lark Behavior

- `record-batch-update` can return success while listing attachment fields appear under `ignored_fields`.
- `照片附件` may be read-only for direct OpenAPI writes: updates that try to remove/reorder attachments can be ignored.
- `record-upload-attachment` is useful for appending new files, not for reliable deletion/reordering.
- Always inspect `ignored_fields` and re-read the record after attempted media-field updates.
- Never expose Base tokens, table IDs, record IDs, field IDs, file tokens, folder tokens, file URLs, cookies, API keys, or connection strings in user-facing messages.

## Verification Checklist

- [ ] SKU row was read before the update.
- [ ] Target media was identified by filename/content/role.
- [ ] `照片链接` / `视频链接` active order is updated.
- [ ] Current ALT list in `备注` matches the active media order.
- [ ] Replacement/deletion note is appended to `备注`.
- [ ] Post-update read confirms active source-of-truth fields changed as intended.
- [ ] If historical attachments remain, final reply explains the limitation without treating it as failure.
- [ ] Final reply does not claim Etsy backend changes unless actually performed and verified.

## Reference Notes

- See `references/bm001-delete-superseded-listing-photo.md` for a concrete BM-001 deletion case where `照片附件` remained read-only but active `照片链接` and ALT source-of-truth were updated.
