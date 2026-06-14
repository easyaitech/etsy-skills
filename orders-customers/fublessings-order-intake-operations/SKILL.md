---
name: fublessings-order-intake-operations
description: Use when recording new FuBlessings Etsy orders from screenshots or copied order details, especially when bootstrapping or maintaining the Orders/Customers Feishu Bases and producing the first confirmation-message draft.
layer: application
---

# FuBlessings Order Intake Operations

Use this skill when the user says a new Etsy order arrived, uploads an order screenshot, or asks to record an order/customer before fulfillment.

This is an operational companion to `orders-customers`. If `orders-customers` becomes editable in this profile, fold this checklist into its Mode B and retire this companion skill.

## Intake from Etsy screenshots

Extract and record:

- buyer name / Etsy username shown;
- order number;
- order amount and currency;
- ordered date;
- ship-by date / right-top ship deadline exactly as shown (`Ship by ...`, `Ship tomorrow`, `Ship today`), plus the computed `承诺发货日`;
- shipping method and shipping charge exactly as shown;
- ship-to city/state/country only in normal summaries; avoid storing or repeating full addresses unless the user explicitly provides a safe reason;
- each item: inferred SKU, title, quantity, style/variant, and custom Chinese text.

If the page shows conflicting ship-by dates, record both in `备注` and use the order-detail card as the provisional `承诺发货日`; tell the user to verify in Etsy details before shipment.

## Base bootstrap fallback

If the Orders/Customers Bases do not exist yet:

1. Create `FuBlessings-订单库` and `FuBlessings-客户库` in the FuBlessings asset/root folder.
2. Rename default tables to `订单` / `客户` when possible.
3. If Feishu field rename or cross-Base relation setup is unreliable, do not block intake:
   - keep the default primary field `文本`;
   - in Orders Base, use `文本` for Etsy order number;
   - in Customers Base, use `文本` for internal customer ID such as `C-2026-0001`;
   - use text fields `客户 ID` / `客户名称` in Orders Base until relations are stable.
4. Write setup facts to `<workspace>/docs/orders-customers-setup.md` with Base tokens, table IDs, and any primary-field convention.

## New order default fields

For a new paid order, default to:

- `状态 = 待发货`
- `SOP 阶段 = 内容确认`
- `买家确认状态 = 待确认`
- `下单确认消息状态 = 已草拟`
- `运输方式 = 标准物流` when the screenshot says Standard Shipping
- `打包视频状态 = 必需` for multi-item, customized, high-value, fragile, or evidence-sensitive orders
- `评价跟进状态 = 未到时间`
- `承诺发货日` = computed from the screenshot's right-top ship deadline
- create a ship reminder for `承诺发货日 - 1 day`; if the reminder time is today or already passed, notify the user immediately in the current chat

Attach the order screenshot to the order record. `lark-cli base +record-upload-attachment` may reject absolute paths; copy the screenshot into the workspace, e.g. `.tmp/order-screenshots/`, and upload via a relative path.

## Confirmation-message draft

After recording, output an English confirmation message for the user to copy into Etsy. It must:

- be warm and concise;
- list every item with style and custom text;
- ask the buyer to confirm before writing/production;
- mention the SHOP.md processing time only after custom details are confirmed;
- avoid sounding like an automated receipt;
- avoid promising faster shipping or anything not in SHOP.md.

## Shipping evidence rule

Actual Etsy order screenshots override assumptions for that order. If the order shows `Standard Shipping (HKD 0.00)`, record shipping as HKD 0.00 even if Product Base defaults say non-free shipping, and flag it as a backend/profile consistency check rather than editing the order fact.

## Verification

Before reporting completion:

- Re-read the order record and customer record.
- Confirm screenshot attachment is present when available.
- Confirm order/customer IDs and SOP fields were written.
- Save a concise markdown note under `<workspace>/output/orders/` with the order summary and confirmation-message draft.

## Overlap

Overlaps with `orders-customers` Mode B and Mode D. This skill exists because some runtime/nested Etsy skills may not be patchable via `skill_manage`; consolidate later when curator tooling supports it.
