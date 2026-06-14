---
name: fublessings-shipping-label-operations
description: Use when associating FuBlessings Etsy waybills, shipping labels, logistics PDFs, tracking numbers, and shipment confirmations with existing Orders Base records, including when to mark an order shipped and set follow-up dates.
layer: application
---

# FuBlessings Shipping Label Operations

Use this skill when the user uploads a shipping label, waybill PDF, logistics document, or tracking number and says it belongs to an Etsy order.

This overlaps with `orders-customers`, `fublessings-order-intake`, `fublessings-order-intake-operations`, and `fublessings-order-fulfillment-operations`. Prefer consolidating this workflow into the fulfillment umbrella when nested skill editing is available; this skill exists to preserve the operational workflow reliably.

## Required grounding

Before writing to Base:

1. Load `orders-customers` / fulfillment SOP if available.
2. Use `SHOP.md` for standard shipping/follow-up timing.
3. Inspect or rely on the live Orders Base schema; operational fields may differ from ideal docs.
4. Do not repeat full street addresses in chat summaries.

## Waybill / PDF association workflow

When the user provides a PDF or document and an Etsy order number:

1. Extract document text before writing anything.
   - For text PDFs, use PyMuPDF / pymupdf extraction.
   - Capture carrier/channel, tracking number, recipient name, destination city/country, weight, package contents, and visible reference numbers.
2. Find the order in `FuBlessings-订单库` by Etsy order number, usually the primary `文本` field.
3. Copy the file into the workspace with a stable relative path, e.g. `.tmp/order-documents/etsy-order-<order>-waybill-<tracking>.pdf`.
4. Upload the file to the order record's `附件` field.
   - Prefer workspace-relative paths because `lark-cli base +record-upload-attachment` can reject or mishandle absolute paths.
5. Update `跟踪号` when the tracking number is confidently extracted.
6. Append a concise `备注` entry with:
   - document filename;
   - extracted logistics facts;
   - whether the actual handoff/shipping date is visible.
7. Save a Markdown note under `<workspace>/output/orders/` with the order summary, extracted facts, and fields updated.
8. Re-read the order record and verify attachment, tracking number, and notes are present before reporting completion.

## Shipping-state rule

A waybill or shipping label proves a label/tracking number exists; it does **not** by itself prove the order physically shipped.

Do **not** change these fields solely because a label PDF exists:

- `状态 = 已发货`
- `发货日期`
- `SOP 阶段 = 待签收跟进`

Only mark shipped when one of these is true:

- the user explicitly says the order has shipped;
- Etsy/backend status confirms shipped;
- the logistics document clearly shows actual handoff/dispatch date.

When the user confirms shipped but gives no exact date:

1. Use the current system date as `发货日期`.
2. Append a note that the user confirmed shipment.
3. Set `状态 = 已发货`.
4. Set `SOP 阶段 = 待签收跟进`.
5. Keep the extracted `跟踪号`.

## Follow-up date rule

If shipping is confirmed and the shipping method is standard logistics, use `SHOP.md` standard shipping timing as an internal follow-up estimate.

Current SHOP.md standard logistics timing: about 15 days.

Set `签收跟进日期 = 发货日期 + 15 days` when no better tracking ETA exists. This is an internal reminder, not a buyer-facing delivery promise.

Do not set `30天复购跟进日期` until the order is actually delivered/signed or the user confirms a delivery date.

## Output format to user

Keep the reply concise and operational. Include:

- order number;
- buyer name;
- tracking number;
- attached document name;
- Base fields updated;
- current SOP stage;
- remaining gaps, if any.

If the label is associated but shipment is not confirmed, explicitly say the order was **not** marked as shipped and explain what confirmation is needed.

If shipment is confirmed, report `发货日期` and `签收跟进日期`.
