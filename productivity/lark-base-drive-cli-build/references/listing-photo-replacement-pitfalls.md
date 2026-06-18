# Listing photo replacement pitfalls (BM-001 red bookmark, 2026-05-22)

This reference captures a concrete FuBlessings listing-photo replacement run where the user sent a new red calligraphy bookmark image and asked to replace one of two similar green/blue bookmark photos.

## Successful sequence

1. Locate the chat-uploaded image in the Hermes profile image cache and visually confirm it matches the user request.
2. Create a sanitized publishing copy under `<workspace>/.cache/ai-image-sanitizer/<SKU>-<YYYYMMDD>/` with a SKU + listing-purpose filename, e.g. `BM-001_listing-reading-lifestyle-red_03.jpg`.
3. Use Pillow metadata fallback if watermark tooling is unavailable: EXIF transpose, RGB conversion, JPEG re-save, then byte-scan for `C2PA`, `OpenAI`, `EXIF`, `XMP`, `prompt`, `Content Credentials`, `DALL` markers.
4. Upload the sanitized copy to the Feishu Drive asset library `商品/` folder first.
5. Attach the same sanitized copy to Product Base `照片附件` via `record-upload-attachment`.
6. Update Product Base `照片链接` and `备注` so listing order and alt text are explicit.
7. Verify with `record-get`; if using Drive search, search by short substring.
8. Write a local Markdown operation record under `output/listing-photo-updates/`.

## CLI / API quirks observed

- `drive +upload --file /absolute/path.jpg` failed with an unsafe file path validation error. Run from the workspace and pass a relative path such as `.cache/ai-image-sanitizer/.../file.jpg`.
- `drive +search --query <full long filename>` failed with field validation because the query exceeded the observed 30-character limit. A short query such as `red_03` worked.
- `record-batch-update` ignored attempts to replace the Product Base attachment list: `READONLY: attachment field cannot be written through OpenAPI`. `record-upload-attachment` appended the new file, leaving the stale old image in attachments.

## Operational rule

When the user asks to replace a listing photo and the attachment field cannot be overwritten:

- Treat `照片链接` + `备注` image order/alt text as the authoritative listing sequence.
- Explicitly note that `照片附件` may contain stale images as extra previews.
- Do not delete Drive files or old attachment media unless the user confirms the exact deletion scope and the agent has verified the file is not used elsewhere.

## Security

Do not include Base tokens, table IDs, record IDs, file tokens, upload URLs, or Drive URLs in user-facing summaries or handoffs. Use `[REDACTED]` where needed.
