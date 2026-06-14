---
name: fublessings-order-intake
description: Record new FuBlessings Etsy orders from screenshots or copied order details into Feishu Orders/Customers Bases, attach evidence, set SOP fields, and draft buyer confirmation messages.
layer: application
---

# FuBlessings Order Intake

Use this skill when the user says a new Etsy order arrived, uploads an Etsy order screenshot, or asks to record an order/customer before fulfillment.

This class-level skill complements the broader `orders-customers` foundation skill. If another runtime skill named `fublessings-order-intake-operations` is available, use that first; this skill captures the durable lark-cli/base operational pitfalls learned during intake.

## Core workflow

1. Extract visible order facts from the screenshot:
   - buyer name / Etsy username shown;
   - order number;
   - order amount and currency;
   - ordered date;
   - ship-by date / right-top ship deadline exactly as shown (`Ship by ...`, `Ship tomorrow`, `Ship today`), plus the computed `承诺发货日`;
   - shipping method and shipping charge exactly as shown;
   - ship-to city/state/country only in normal summaries;
   - each item: inferred SKU, title, quantity, style/variant, and custom Chinese text.
2. Match the item against the FuBlessings Product Base where possible.
3. Before writing, inspect live Feishu Base fields/options for both Orders and Customers tables; do not rely only on ideal schema docs.
4. Check for duplicate order/customer records.
5. Create or update the Customer record.
6. Create the Order record with default SOP fields.
7. Copy order screenshots into workspace-relative `.tmp/order-screenshots/` and upload them to the order record's attachment field.
8. Re-read both records and verify the key fields and attachment before reporting completion.
9. Save a concise markdown note under `<workspace>/output/orders/` with the order summary and confirmation-message draft.

## New order default fields

For a new paid order, default to:

- `状态 = 待发货`
- `SOP 阶段 = 内容确认`
- `买家确认状态 = 待确认`
- `下单确认消息状态 = 已草拟`
- `运输方式 = 标准物流` when the screenshot says Standard Shipping
- `打包视频状态 = 必需` for customized, multi-item, high-value, fragile, or evidence-sensitive orders
- `评价跟进状态 = 未到时间`
- `承诺发货日` = computed from the screenshot's right-top ship deadline
- create a ship reminder for `承诺发货日 - 1 day`; if the reminder time is today or already passed, notify the user immediately in the current chat

## Live Base schema and lark-cli pitfalls

Operational Feishu Bases can differ from reference schemas. Always list live fields/options before creating records.

Known mismatch examples:

- Customers Base may not have `首次接触渠道`; if missing, record the channel note in `偏好备忘` or `客服备忘` instead of failing the intake.
- Customers Base `客户标签` options may use operational labels such as `首次购买`, `礼物客户`, `美国客户`, rather than idealized reference labels like `新客`, `送礼客`.
- `lark-cli base +record-upload-attachment` may work more reliably with workspace-relative files copied into `.tmp/order-screenshots/`.

See `references/lark-cli-order-intake-pitfalls.md` for the concise checklist.

## Confirmation-message draft

After recording, output an English confirmation message for the user to copy into Etsy. It must:

- be warm and concise;
- list every item with style and custom text;
- ask the buyer to confirm before writing/production;
- mention SHOP.md processing time only after custom details are confirmed;
- avoid sounding like an automated receipt;
- avoid promising faster shipping or anything not in SHOP.md.

## Verification before final reply

- Re-read the order record.
- Re-read the customer record.
- Confirm screenshot attachment is present when available.
- Confirm order/customer IDs and SOP fields were written.
- Confirm the local markdown order note exists.

## Privacy

Do not repeat full street addresses in chat summaries. City/state/country is enough unless the user explicitly needs full address handling for fulfillment.
