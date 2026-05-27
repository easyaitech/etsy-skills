# Single vs Carousel for Social Asset Pool Images

## Trigger

Use this reference when the user asks to arrange many images from `FuBlessings-素材库 / 社交媒体` or the Asset Pool into Pinterest Pin Queue records.

## Key lesson

For bulk social-media assets, do **not** assume that “16 张图片全部安排发布 Pinterest” means “group them into carousels.” In this context, the user may expect each image to be a separate Pin.

Default handling:

1. If user explicitly says `单图 / 每张单独 / 不要组合` → create one `单图` Pin per logical image.
2. If user explicitly says `一组 / 轮播 / carousel / 组合` → group into carousel records, keeping explicit image order.
3. If user only says `全部安排发布 Pinterest` for a large batch → prefer single-image Pin records, or briefly confirm before writing Base.

## Logical image count after dedupe

When duplicate reuploads were removed, “the 16 images” may still mean 16 logical images:

- include retained older Asset Pool rows for exact duplicates;
- include true newly-created Asset Pool rows;
- do not only process the 12 newly inserted rows if 4 duplicates were kept as older assets.

## Correcting an accidental carousel batch

If carousel Pin Queue drafts were created but not published and the user corrects to single-image Pins:

1. Back up Pin Queue + Asset Pool records.
2. Delete or otherwise disable the unpubished carousel queue rows before their scheduled time.
3. Reuse or recreate the intended Pin IDs only if the old Base rows are gone; otherwise allocate fresh IDs.
4. Create one runtime JSON per image using single-image schema:

```json
{
  "image": "/absolute/path/to/processed.jpg",
  "title": "...",
  "board": "...",
  "link": "...",
  "description": "...",
  "altText": "...",
  "chromeProfile": "..."
}
```

5. Write Pin Queue fields as `pin 类型 = 单图`, `图片数量 = 1`, and `关联素材 = 1. ASSET-...`.
6. Reassign each Asset Pool row `关联发布任务` to the final single-image Pin ID and keep `AI 清理状态 = 已清 metadata` if a metadata-stripped publishing copy exists.
7. Run validate for every runtime JSON.
8. Move obsolete carousel content drafts into a backup folder so the auto-publish worker cannot accidentally use stale local docs.
9. Update `docs/pinterest-autopin-setup.md` and `docs/content-asset-pool-setup.md` with the correction.

## Scheduling

For single-image batches, default to the user's FuBlessings Pinterest cadence: 2 per day in North America-friendly slots unless the user specifies otherwise:

- 15:30 EDT / 12:30 PDT
- 20:30 EDT / 17:30 PDT

Start after existing pending Pin Queue records to avoid overloading the schedule.
