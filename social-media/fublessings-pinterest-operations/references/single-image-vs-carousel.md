# Single-image vs Carousel Pins for Social Asset Pool

## Durable lesson

When the user asks to schedule a batch of social-media assets for Pinterest, do **not** assume the batch should be grouped into carousel Pins if the wording implies each image should be its own Pin, or if the user later corrects “不要组合在一起 / 以单图形式发送 pin”.

This is a workflow preference for FuBlessings Pinterest operations:

- Explicit `单图 / one image each / 不要组合 / 不要轮播` overrides the default image-group carousel behavior.
- For social-media intake batches, the safer default is to ask or infer from the user’s wording:
  - “这几张是一组 / 做成一条 / 轮播” → one carousel task.
  - “全部安排发布 / 每张都发 / 以单图形式” → one Pin Queue record per image.
- If carousels were already created but not published, delete or supersede those draft Queue records before creating the single-image replacements, so the auto-publish cron cannot publish the wrong format.

## Replacement workflow

1. Identify the draft carousel Pin Queue records created from the batch.
2. Back up the current Pin Queue and Asset Pool rows.
3. Delete only unpublished carousel drafts. Do not touch published records.
4. Create one single-image Runtime JSON per asset using the `image` + `altText` schema, not the carousel `images[]` schema.
5. Create one Pin Queue row per image:
   - `pin 类型 = 单图`
   - `图片数量 = 1`
   - `关联素材 = 1. ASSET-...`
   - `image 路径 = <single processed image path>`
6. Reuse the same SKU/product linkage logic:
   - Product Pins: `SKU | Product Base record <record_id> | Listing ID <listing_id>`
   - If a SKU has no listing/share link yet, use the documented temporary fallback and clearly report it.
7. Update Asset Pool rows so each asset’s `关联发布任务` points to the final single-image Pin ID, not the deleted carousel ID.
8. Validate every Runtime JSON before reporting completion.
9. Move or mark superseded carousel local drafts so future runs do not accidentally use them.

## Board routing note

A dedicated Board exists for ongoing culture/character education content:

```text
Chinese Calligraphy Meanings
```

Use it for:

- Chinese character meaning explainers
- blessing phrase explainers
- calligraphy/culture education cards

Keep `The Calligrapher's Studio · Behind the Brush` for studio process, behind-the-scenes, tools, artist/workflow context, and non-educational studio storytelling.
