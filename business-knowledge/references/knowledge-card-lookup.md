# Knowledge Card Lookup Contract

Canonical contract for downstream skills.

## Dependency level

Knowledge Cards are `SKIP`.

If the store Base or its `Knowledge Cards 知识卡片` table is missing, empty, or unreadable, downstream skills continue their original workflow. Do not block listing, pin, shoot brief, video, or customer-service work.

## Input shape

```text
scenario: listing | marketing_brief | Pinterest | TikTok | 拍摄 | 选品 | 供应链 | 客服
sku_context:
  sku:
  category:
  materials:
  price_range:
  gift_words:
  seo_keywords:
  target_audience:
marketing_context:
  channels:
  campaign_goal:
  season_or_event:
max_cards: 3
```

Only include fields that exist. Do not invent missing SKU facts.

## Query order

1. Filter `有效状态 in active, watch`.
2. Filter `适用场景 includes scenario`.
3. Prefer exact `适用 SKU` match if present.
4. Match `关键词标签` against SKU, category, materials, gift words, SEO keywords, channels, season/event.
5. Exclude cards whose `禁用场景` conflicts with the current task.
6. Sort by:
   - exact SKU match
   - active before watch
   - fresher `记录日期`
   - stronger keyword overlap
7. Return at most `max_cards`.

Do not read linked wiki pages for every candidate. First choose the small candidate set from Base; then read `知识页链接` only for selected cards that need detail.

## Output shape

```text
cards:
  - title:
    source:
    recorded_date:
    summary:
    suggested_use:
    boundary:
    adopted_this_run: yes / no / partial
    why:
```

## Display rule

If no cards match, stay quiet unless the user explicitly asks whether knowledge was checked.

If cards match, show a short section:

```text
可参考知识卡片：
1. {title}
   来源：{source}（{recorded_date}）
   可用处：{suggested_use}
   本次采用：yes/no/partial，{why}
   边界：{boundary}
```

Never silently use a card.

## Best-effort usage counters

When a card is adopted (`yes` or `partial`), try to update:

- `引用次数 += 1`
- `最后引用日期 = today`

If update fails, continue the user-facing output and mention the statistics update failure briefly.
