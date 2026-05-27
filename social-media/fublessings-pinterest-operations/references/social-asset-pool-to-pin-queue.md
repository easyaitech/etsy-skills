# Social Asset Pool → Pinterest Pin Queue

Use this reference when the user says newly added social-media assets should all be arranged for Pinterest and associated with products.

## When this applies

- User has dropped images into `FuBlessings-素材库 / 社交媒体`.
- `content-asset-pool` has already scanned/deduped them into Asset Pool rows, or there are retained older rows for exact duplicate reuploads.
- User asks to fill Pinterest Pin Queue fields and link to products/SKUs.

## Key pattern

1. Treat the user's “new 16 images” as **logical images**, not necessarily 16 new Asset Pool rows. If exact duplicate uploads were removed, include the retained existing Asset Pool rows in the publishing set.
2. Build a contact sheet or visually inspect the images to classify by product/theme:
   - fridge magnets → `MAG-001`
   - mini scrolls → `SCR-001`
   - bookmarks → `BM-001`
   - Chinese-character meaning / cultural explainer cards → `BRAND-CHAR-AI`
   - other cultural/story cards → brand/story SKU placeholder if no product
3. Group into Pinterest carousels of 2–5 images. Do not split a coherent 4-image product group into single-image pins unless requested.
   - If the new social-media images are a coherent 4-card Chinese-character explainer for one character (e.g. `愛 / Love`, `寿 / Longevity`), create **one** 4-image carousel Pin, not four single-image Pins.
   - Route Chinese-character explainer carousels to Board `Chinese Calligraphy Meanings`; use `关联 SKU=BRAND-CHAR-AI` and the brand/site link (currently `https://fublessings.com`) unless a more specific destination is supplied.
   - For character explainers, title format should normally be `The Meaning of <character> in Chinese Calligraphy`; description should explain cultural meaning with `symbolizes / represents / expresses` language and explicitly avoid promising effects. If the character is tied to elders, birthdays, longevity, or family blessings, keep it as a respectful wish / gifting context, not a health or luck claim.
4. For each Pin Queue record, populate the full operational fields:
   - `pin_id`, `状态=待发`, `关联 SKU`, `关联素材`, `Board (Pinterest)`, `同步 Board(s)`
   - `Title (EN)`, `Description (EN)`, `Alt Text (EN)`
   - `Link`, `image 路径`, `封面图`, `pin 类型`, `图片数量`, `创意主题`, `计划发布时间`, `备注`, `重试次数=0`
5. Generate metadata-stripped publishing copies under `.cache/pinterest-autopin/processed/<PIN-ID>/`; never overwrite originals.
6. Generate runtime JSON under `.cache/pinterest-autopin/runtime/<PIN-ID>.json` with the same `link` as Pin Queue.
7. Create a local content draft under `output/social-media/`.
8. Run AutoPin validate for every runtime JSON before reporting complete.
9. Update Asset Pool rows:
   - `素材生命周期状态=已入任务`
   - `AI 清理状态=已清 metadata`
   - `像素级水印处理=不建议`
   - `关联 SKU`, `关联发布任务`, `发布副本本地路径`, `发布副本 hash`, `发布状态摘要`

## Scope guard for mixed media

When the user explicitly asks to process newly added images, ignore unrelated files in the same folder (for example `.mp4` video/audio artifacts) unless the user also asks to process video or all media. Mention the ignored file briefly in the final report so it is not mistaken for missed work.

## Product link rule

- For `MAG-001` and `SCR-001`, use Product Base `分享链接`.
- If a product row exists but lacks `Etsy Listing ID` / `分享链接` (example: draft `BM-001`), still link the Pin Queue row to `SKU | Product Base record <record_id> | Listing ID N/A`, and use the shop URL as a temporary fallback **only if the product-specific share link is unavailable**. State this clearly in the final report so it can be replaced later.

## Scheduling convention

If the user asks to arrange publishing but does not specify exact times, continue after existing queued pins and use the user's Pinterest preference slots, commonly:

- `15:30 EDT / 12:30 PDT`
- `20:30 EDT / 17:30 PDT`

Avoid changing already-published rows. Do not final-publish unless explicitly asked.

## Verification checklist

- Pin Queue rows exist and show the intended product/SKU association.
- Runtime JSON `link` matches Pin Queue `Link`.
- Each runtime JSON validates successfully.
- Asset Pool rows point back to the correct Pin IDs.
- If the queued item is a Chinese-character explainer, re-check the 3-day Pinterest safety-stock rule after insertion: character explainers should have at least 3 pending items; if still below threshold, report the shortfall concisely.
- Content docs (`docs/pinterest-autopin-setup.md`, and if applicable `docs/content-asset-pool-setup.md`) record the new queue entries.
