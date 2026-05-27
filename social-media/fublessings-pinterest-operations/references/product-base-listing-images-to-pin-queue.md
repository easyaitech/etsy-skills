# Product Base listing images → Pinterest Pin Queue

Use this reference when the user asks to create Pinterest auto-publish items from listing images already stored in the FuBlessings Product Base.

## Proven workflow

1. Locate the Product Base rows by SKU/category/name, then capture both:
   - SKU, e.g. `MAG-001` or `SCR-001`
   - Product Base `record_id`
   - Etsy Listing ID if present
2. Read listing image order from the Product Base `照片链接` field when available. It carries numbered lines such as:

```text
1. MAG-001_listing-on-fridge-lifestyle_01.jpg — https://my.feishu.cn/file/<file_token>
```

3. Prefer the full file tokens extracted from the `照片链接` URLs for `lark-cli drive +download`.
   - The `照片附件` field may expose attachment `file_token` values that can return HTTP 403 when downloaded directly.
   - The fix is not to declare attachments unusable; fall back to the full `/file/<token>` tokens embedded in `照片链接`.
4. Download into workspace cache with relative output paths:

```bash
LARK_CLI_NO_PROXY=1 lark-cli drive +download \
  --file-token '<file_token_from_photo_link_url>' \
  --output '.cache/pinterest-autopin/source/<SKU>_listing_images/01_<filename>.jpg' \
  --overwrite
```

5. Current carousel publishing supports up to 5 images. If Product Base has more listing images, use the first 5 in the Product Base image order unless the user specifies otherwise.
6. Re-save publishing copies under `.cache/pinterest-autopin/processed/<PIN_ID>/` to strip metadata; do not modify source files.
7. Create one Pin Queue row per product, not one per image.
8. In Pin Queue, always link back to the product in `关联 SKU` even though the field is text, not a true cross-base relation. Use a traceable string:

```text
<SKU> | Product Base record <record_id> | Listing ID <listing_id>
```

9. `关联素材` can list the selected listing image filenames; `image 路径` should contain absolute processed image paths, one per line in carousel order.
10. Run `npm run pin:validate -- --input <runtime-json>` for each created Pin before reporting success.

## Scheduling convention

For two product pins created together, use North America-friendly slots and avoid same-slot collisions with already queued pins:

- First product: `20:30 EDT / 17:30 PDT` if the same day's `15:30 EDT` slot is already occupied.
- Second product: next available day at `15:30 EDT / 12:30 PDT`.

Always include the CST equivalent in `计划发布时间`.
