# Chat image Drive backup expectation

## Why this matters

For FuBlessings, images sent through chat are operational assets. The user's expectation is that every chat-uploaded image is backed up to Feishu Drive in the asset library, not merely attached to a Base record.

## Correct behavior

When a chat image is used for a listing, Pinterest task, product catalog update, or asset indexing:

1. Treat the image as an asset-library intake event.
2. Upload it to the correct Drive folder first.
3. Only then update downstream Base records/queues.
4. If the downstream workflow needs Base attachments, attach the same file after Drive upload.
5. Report both layers separately: Drive backup path/link and Base/queue update.

## Folder defaults

- Product/listing photo: `商品/`
- Brand/logo/packaging/template: `品牌/`
- Customer UGC or custom reference: `客户/`
- Studio/process/material: `工作室/`
- Unclear or unsorted: `待处理/`
- Social/ad/email derivative: `营销/` when that folder exists in the current asset library; otherwise use the documented local structure or `待处理/` and note the mismatch.

## Failure pattern to avoid

Do not perform only `base +record-upload-attachment` and say the image was backed up. That creates Base attachment media but does not place a managed file in the Drive asset-library folder.
