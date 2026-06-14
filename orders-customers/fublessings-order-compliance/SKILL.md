---
name: fublessings-order-compliance
description: Use when a FuBlessings Etsy order contains compliance-sensitive content or operational inconsistencies during intake or fulfillment, such as religious/cultural phrases, conflicting ship-by dates, or shipping/profile mismatches.
layer: application
---

# FuBlessings Order Compliance

Use this class-level skill alongside order intake and customer-service skills when a new or existing FuBlessings Etsy order has details that need extra care before writing, messaging, production, or shipment.

## Triggers

- Buyer-provided custom text is religious, Buddhist, prayer-like, spiritual, talismanic, or culturally sensitive.
- Buyer text appears in Japanese kanji, traditional Chinese, variant characters, names, or phrases where exact glyph choice matters.
- Etsy order screenshots show conflicting ship-by dates.
- Etsy order shipping charge differs from Product Base defaults or expected shipping profile.
- A buyer confirmation message could accidentally imply religious, luck, protection, healing, or spiritual efficacy.

## Sensitive / religious custom text boundary

When the custom text is religious, Buddhist, prayer-like, or culturally sensitive, for example Japanese kanji `南無阿弥陀仏`:

1. Record the exact characters as provided by the buyer.
2. Do not silently convert script, simplify/traditionalize, translate, normalize variants, or "correct" the phrase.
3. Add an order-note production warning to confirm exact characters before writing.
4. Treat the phrase only as buyer-specified decorative calligraphy text.
5. Do not imply FuBlessings sells talismans, charms, religious objects, luck/protection/healing items, or any spiritual efficacy.
6. Keep buyer-facing messages factual and neutral: confirm exact characters, style, item, and processing time only after confirmation.

## Buyer confirmation wording pattern

Use a neutral confirmation like:

```text
Could you please confirm that these are the exact characters you would like us to write? We will write them exactly as shown unless you would like a different version.
```

If the phrase appears to be Japanese kanji or another non-simplified-Chinese form, it is safe to say:

```text
This phrase uses Japanese kanji forms, so we will write it exactly as shown unless you would like a different version.
```

Avoid explaining religious meaning unless the buyer asks, and even then keep it cultural/linguistic rather than efficacy-based.

## Ship-by and shipping evidence

- If the order card and page grouping show different ship-by dates, record both in `备注`, use the order-detail card as provisional `承诺发货日`, and tell the user to verify Etsy order detail before shipment.
- If the order shows `Standard Shipping (HKD 0.00)`, record HKD 0.00 for that order even if Product Base defaults say non-free shipping. Flag it as a backend/profile consistency check rather than changing the order fact.

## Verification

Before finalizing an intake involving this skill:

- Re-read the order record and confirm the compliance note is present.
- Confirm the buyer message draft does not contain efficacy claims or religious product positioning.
- Confirm exact custom characters are preserved in the Base record, local markdown note, and message draft.
