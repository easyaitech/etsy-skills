# Card Extraction Rules

Knowledge Cards are business-action indexes.

## Extract only when useful

Create a candidate card only when the signal can plausibly affect at least one action:

- listing wording, tags, title angle, description section
- Pinterest board, pin title, pin description, visual direction
- TikTok hook, overlay copy, shot structure
- shoot brief / photo context
- product selection, supplier choice, customer-service framing

If the material is interesting but not actionable, keep it in weekly/wiki only.

## Required card fields

```text
标题:
一句话摘要:
卡片类型:
来源:
记录日期:
适用场景:
关键词标签:
建议动作:
有效状态:
知识页链接:
禁用场景:
过期提醒日期:
```

`卡片类型` ∈ `方法论 / 趋势 / 选品 / 定位 / 观察`（语义和下游消费见 [`base-schema.md`](base-schema.md) §卡片类型与消费）。判定要点：能写出可执行清单 / 模板 / 正反例、且有 wiki 正文承载的写作或运营 SOP → `方法论`（它会触发下游强制读 wiki）；时效热点 / 季节信号 → `趋势`；竞品 / 选品 / 供应链 → `选品`；店铺级长效定位 → `定位`；其余 → `观察`（默认）。一张 `方法论` 卡若没有够厚的 `知识页链接` wiki，先把方法论正文补进 wiki，再标 `方法论`。

## Status guidance

- `active`: evidence is relevant, current, and has a clear business use.
- `watch`: plausible but weak, seasonal, or needs validation.
- `expired`: time-sensitive and no longer relevant.
- `rejected`: reviewed and should not be used by default.

Default to `watch` when unsure.

## Expiry sweep

Time-sensitive cards must not linger in `active` / `watch` after they expire, or downstream lookups (e.g. listing step 5.6) keep surfacing stale signals. Until a monthly health check exists, every Weekly Intake runs one general sweep — **source-agnostic**:

- Condition: `过期提醒日期 < today` AND `有效状态 in active, watch`.
- Action: propose `有效状态 = expired` via the normal Base diff preview + confirm.

The sweep does **not** look at `来源`. Trend-radar hot-word cards, seasonal / holiday cards (e.g. a Father's-Day window), and any other dated card are all swept the same way. Source-specific defaults (e.g. trend cards expire at `记录日期 + 45 天`) only set `过期提醒日期`; they never narrow which cards the sweep covers.

Cards with no `过期提醒日期` are evergreen and skipped.

## Limits

- Weekly Intake: generate 5-10 candidates, write at most 10 approved cards.
- Listing lookup: return at most 3 cards.
- Marketing Brief: return at most 5 cards.

## Boundaries

Every card must include a boundary or caveat. Examples:

- “Only for wedding / floral / personalized gift SKUs.”
- “Do not use for utility-only products.”
- “Good for Pinterest copy, not Etsy title.”
- “Watch only; based on one report.”

No boundary means the card is not ready for Base.
