# Base attachments vs Drive files

## Session learning

In FuBlessings listing-photo work, product images were uploaded to the product Base `照片附件` field but were not backed up into the Drive asset library. The Base row showed attachment `file_token`s, but Drive search could not find those filenames, and attempting `lark-cli drive +download --file-token <base_attachment_file_token>` returned `HTTP 403`.

## Practical rule

- `base +record-upload-attachment` writes media into a Base attachment field.
- It is useful for showing images inline in a Base row.
- It is **not** equivalent to uploading the file into a Drive folder.
- Attachment media tokens may need Bitable/media download APIs, not ordinary Drive file download.

## Correct Etsy/FuBlessings sequence

For chat-uploaded product/listing images:

1. Save or locate the local publish copy.
2. Upload it to the asset-library Drive folder first:
   - `商品/` for product/listing photos
   - `品牌/` for logo/packaging/brand assets
   - `客户/` for UGC or custom-reference images
   - `工作室/` for studio/process images
   - `待处理/` if unclassified
3. Capture and verify the Drive `file_token` / link.
4. If needed, also upload the same file to the product Base `照片附件` field.
5. Write the Drive link into `照片链接` and/or the material index Base.
6. Verify both layers independently:
   - Drive upload returned a token/link and is in the expected folder.
   - Base record shows the expected attachment filenames/links.

## Diagnostic signs of the mistake

- Product Base has `照片附件` populated but `照片链接` is empty.
- `drive +search --query <short filename fragment>` returns no Drive result.
- `drive +download --file-token <attachment_token>` returns `HTTP 403`.

When these occur, do not tell the user the images are backed up to Drive; ask for/source the local files and upload them properly to the asset library.
