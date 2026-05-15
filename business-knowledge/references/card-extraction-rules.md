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

## Status guidance

- `active`: evidence is relevant, current, and has a clear business use.
- `watch`: plausible but weak, seasonal, or needs validation.
- `expired`: time-sensitive and no longer relevant.
- `rejected`: reviewed and should not be used by default.

Default to `watch` when unsure.

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
