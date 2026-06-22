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

Do not read linked wiki pages for every candidate. First choose the small candidate set from Base. Then read `知识页链接` by card type:

- **`方法论` cards (`卡片类型 = 方法论`): reading the wiki is MANDATORY.** The card's one-liner is only a pointer; the real deliverable is the wiki's checklist / template / worked examples, which you must **apply** to the output — not merely display. Skipping the wiki for a methodology card defeats its purpose: it degrades back into a vague reminder, which is exactly the failure mode these cards exist to prevent.
- **All other types (`趋势` / `选品` / `定位` / `观察`)**: read `知识页链接` only when a selected card needs extra detail. The one-liner is usually enough.

## Output shape

```text
cards:
  - title:
    card_type:           # 方法论 / 趋势 / 选品 / 定位 / 观察
    source:
    recorded_date:
    summary:
    suggested_use:
    boundary:
    adopted_this_run: yes / no / partial
    why:
    playbook_applied:    # 仅 方法论 卡：从 wiki 实际套用的清单 / 模板 / 开头规则；其余类型留空
```

## Display rule

If no cards match, stay quiet unless the user explicitly asks whether knowledge was checked.

If cards match, show a short section:

```text
可参考知识卡片：
1. {title}（{card_type}）
   来源：{source}（{recorded_date}）
   可用处：{suggested_use}
   本次采用：yes/no/partial，{why}
   边界：{boundary}
```

`方法论` 卡在上面基础上必须额外列出从 wiki 实际套用的清单 / 模板 / 开头规则（`playbook_applied`），让用户看到知识真的落进了产出，而不是只报了个标题。

Never silently use a card.

## Best-effort usage counters

When a card is adopted (`yes` or `partial`), try to update:

- `引用次数 += 1`
- `最后引用日期 = today`

If update fails, continue the user-facing output and mention the statistics update failure briefly.
