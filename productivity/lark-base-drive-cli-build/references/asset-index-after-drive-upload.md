# Asset index after Drive upload

When working with the ETSY/FuBlessings asset library, Drive upload and Base indexing are separate obligations.

## Required sequence for promoted assets

1. Upload or move the file into the correct Drive folder.
2. Verify the target folder lists the file and capture its `url` / `file_token`.
3. Create or update the material index Base row.
4. Verify the Base row with `+record-search` by `文件名`.
5. Only then tell the user the asset is fully archived.

## Fields used for brand logo/icon assets

For FuBlessings logo/icon files in `FuBlessings-素材库 / 品牌`:

- `素材类型`: `["Logo"]`
- `用途标签`: `["内部参考"]` unless there is a specific channel use
- `公开授权`: `已授权`
- `BRAND 合规`: `true`
- `比例 / 尺寸`:
  - icon/round logo: `["1x1"]`
  - banner: `["16x9"]`
  - primary/freeform logo: `["自由"]`
- `文件链接`: Feishu file URL from Drive upload/listing
- `备注`: include source/version, e.g. `[品牌资产] 2026-05-16 新版 FuBlessings logo/icon ...`

## User-visible pitfall

If the user says “素材索引没有更新”, do not defend the prior Drive upload. Immediately inspect the Base table, add missing records, verify each filename, and report the verified count.
