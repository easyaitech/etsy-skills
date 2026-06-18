---
name: fublessings-order-fulfillment-operations
description: "Use when operating FuBlessings Etsy order fulfillment after an order screenshot or when running proactive daily order patrols: extract Ship by deadlines, record order facts, track SOP stage gaps, and remind the user before shipping/follow-up deadlines."
layer: application
---

# FuBlessings Order Fulfillment Operations

Use this skill for FuBlessings Etsy order lifecycle operations, especially:

- the user sends an Etsy order screenshot;
- the user asks what step an order is at;
- the user wants reminders before `Ship by` deadlines;
- a daily cron/patrol needs to scan open orders and report SOP blockers.

This skill overlaps with `orders-customers`, `fublessings-order-intake`, and `fublessings-order-intake-operations`. Prefer those foundation/intake skills when editable and available; this skill captures the durable operational rule learned from order screenshots and daily reminder setup.

## Required context

Before acting, ground in:

1. `orders-customers` and `references/order-fulfillment-sop.md` when available.
2. `<workspace>/BRAND.md` for buyer-facing tone.
3. `<workspace>/SHOP.md` for processing time, shipping, and policy commitments.
4. Live Feishu Base schema before writing; operational fields may differ from ideal docs.

## Order screenshot intake rule

When the user sends an Etsy order screenshot, do not only summarize the image. Treat it as an order-intake trigger unless the user explicitly says it is just an example.

Extract and preserve:

- buyer name / Etsy username shown;
- order number;
- order amount and currency;
- ordered date;
- right-top shipping deadline exactly as shown: `Ship by ...`, `Ship tomorrow`, `Ship today`, etc.;
- computed `承诺发货日`;
- shipping method and shipping charge exactly as shown;
- ship-to city/state/country only in normal chat summaries;
- each item: title/SKU if inferable, quantity, style/variant, custom text.

Privacy: do not repeat full street addresses in chat unless the user explicitly needs fulfillment/address handling.

## Default order state

For a new paid order, default to:

- `状态 = 待发货`
- `SOP 阶段 = 内容确认`
- `买家确认状态 = 待确认`
- `下单确认消息状态 = 已草拟`
- `评价跟进状态 = 未到时间`
- `打包视频状态 = 必需` for custom, multi-item, high-value, fragile, or evidence-sensitive orders
- `承诺发货日` = computed from the top-right Etsy `Ship by` deadline

Attach/copy the order screenshot to the order record when the order is being formally recorded.

## Ship-by reminder rule

The right-top Etsy deadline is operationally critical.

- Reminder time = `承诺发货日 - 1 day`.
- If the screenshot says `Ship by tomorrow`, the reminder is due immediately in the current chat.
- If today is the deadline, output high-priority reminder.
- If the deadline has passed and the order is not shipped, output urgent overdue reminder.

Reminder content should include:

- priority;
- order number;
- buyer;
- item/custom text summary;
- `Ship by` / `承诺发货日`;
- current SOP stage;
- missing evidence/fields;
- recommended next action.

## Daily order SOP patrol

Maintain a daily cron-style patrol for open orders. It should scan incomplete/non-cancelled Orders Base records and check:

1. Deadline risk:
   - tomorrow is `Ship by`;
   - today is `Ship by`;
   - overdue and not shipped.
2. SOP blockers:
   - content confirmation missing;
   - buyer confirmation missing;
   - confirmation photo or outbound checklist missing;
   - packing video required but missing/not completed;
   - tracking number or ship date missing.
3. Follow-up:
   - due delivery/signing review message;
   - due 30-day repurchase/coupon follow-up.

Output priority order:

1. overdue;
2. today Ship by;
3. tomorrow Ship by;
4. SOP gaps;
5. delivery/repurchase follow-up.

If nothing needs action, say exactly:

```text
今日订单履约巡检：暂无需要处理的订单提醒。
```

## Buyer messaging boundary

Do not send Etsy buyer messages directly. Draft English buyer-facing messages for the user to copy. If a reminder implies buyer communication is needed, say `建议起草消息` and provide a draft only when asked or when the workflow explicitly needs it.

## Output style

Internal operations/reminders to the user: Chinese, concise, execution-oriented.
Buyer-facing drafts: English, warm, professional, grounded in BRAND.md and SHOP.md.
