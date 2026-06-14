---
name: pinterest-social-asset-queueing
description: Use when ingesting FuBlessings Feishu Drive social-media folder assets into the Asset Pool and arranging them into Pinterest Pin Queue rows, including grouped character-meaning carousels, source-only videos, publishing-copy cleanup, request JSON validation, and workspace doc updates.
layer: application
---

# Pinterest Social Asset Queueing

Use this skill when the user says the Feishu Drive `FuBlessings-素材库 / 社交媒体` folder has new files/materials and asks to arrange, queue, or schedule them for Pinterest.

This is an operational bridge between:

- Feishu Drive social-media folder
- `FuBlessings-素材发布池` Asset Pool Base
- Pinterest Pin Queue Base
- local publishing copies under `.cache/pinterest-autopin/processed/`
- workspace docs under `docs/`

## Standard workflow

1. **Inspect the social-media Drive folder.** Group new files by filename prefix/stem, e.g. `ren-1.png` … `ren-5.png` plus `ren.mp4`.
2. **Deduplicate before writing.** Compare candidate Drive file tokens and SHA256 hashes against existing Asset Pool rows:
   - `原图 file token`
   - `原图 hash`
   - recent `关联发布任务`
3. **Download for hashing / QA.** With `lark-cli drive +download`, `--output` must be a relative path within the command cwd. `cd` into the target cache directory and pass `--output filename`; do not pass an absolute output path.
4. **Visual QA.** Generate a contact sheet when there are many images. Use it to infer:
   - logical groups
   - carousel order
   - theme / title angle
   - per-image alt text
5. **Create publishing copies for images only.** Write copies to:
   - `<workspace>/.cache/pinterest-autopin/processed/<PIN-ID>/NN_<source-name>`
   Clean AI metadata/provenance on the publishing copies only; originals in Drive stay unchanged. Apply lossless compression when available.
6. **Treat videos as source-only by default.** Unless the user explicitly asks to publish videos, create Asset Pool video rows only:
   - `素材类型=视频`
   - `素材生命周期状态=待处理`
   - `AI 清理状态=未处理`
   - no Pin Queue row
   - no publishing copy
7. **Create one Pin Queue row per logical carousel group.** Do not create one row per image. Preserve order via:
   - `image 路径`: one processed path per line
   - `Alt Text (EN)`: one alt text per image, separated by standalone `---`
8. **Write request JSON** under `<workspace>/.cache/pinterest-autopin/runtime/<PIN-ID>.json`.
9. **Validate before reporting.** Run `npm run pin:validate -- --input <abs-json-path>` for every request JSON.
10. **Re-read Base tables after writes.** Verify that all new Asset IDs and Pin IDs exist and that Pin rows have expected status, image count, planned publish time, and image paths.
11. **Update workspace docs** after successful queueing:
    - `docs/content-asset-pool-setup.md`
    - `docs/pinterest-autopin-setup.md`

## lark-cli parsing pitfall

In this workspace, `lark-cli base +record-list` may return table-shaped output rather than an `items` list:

```json
{
  "data": {
    "fields": ["字段名", "..."],
    "data": [["cell", "..."]],
    "record_id_list": ["rec..."]
  }
}
```

Parse it by mapping field names to row indices and zipping `record_id_list` with `data` rows. Do not assume `data.items[].fields` exists.

## Scheduling convention

For character-meaning / culture carousel groups, append to the character-content track at the next available North-America-friendly slot unless the user says otherwise. Keep character inventory separate from product/gift inventory.

Current cadence convention:

- Character / educational pins: 1 per day
- Product / gift pins: 1 per day
- Safety stock is checked separately for each class

## Content rules

Follow the Pinterest copy rules from `pinterest-autopin`:

- Pin copy is English.
- Titles must include a gift, audience, holiday, or life-stage search angle, not only “The Meaning of X”.
- Descriptions should answer at least two of: suitable occasion, suitable recipient, gift meaning.
- For FuBlessings, prefer `symbolizes`, `represents`, or `expresses`; avoid mystical or outcome-promising verbs.
- Alt text describes what each image visibly shows; do not copy the title into every alt.

## Verification checklist

- [ ] New Drive candidates grouped correctly.
- [ ] Duplicate token/hash check completed.
- [ ] Images have publishing copies under the correct `PIN-ID` directory.
- [ ] AI metadata/provenance cleanup applied or checked on publishing copies.
- [ ] Videos are source-only unless explicitly requested for publishing.
- [ ] Asset Pool rows exist for all processed images/videos.
- [ ] Pin Queue rows exist, one per logical carousel group.
- [ ] `image 路径` count equals `图片数量` and alt sections count.
- [ ] Request JSON validates via AutoPin.
- [ ] Workspace docs updated.
