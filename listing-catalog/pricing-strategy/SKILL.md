---
name: pricing-strategy
description: Use when evaluating or recommending Etsy/FuBlessings product prices, price bands, margin sanity checks, or whether to update prices in the product Base. Covers brand-positioned pricing, rough Etsy fee stress tests, competitor anchors, and Base update safety.
layer: foundation
---

# Pricing Strategy

Use this skill when the user asks whether a FuBlessings/Etsy product price is reasonable, wants recommended price bands, asks to compare prices with competitors, or asks to change `售价 (HKD)` in the product Base.

This is a class-level pricing workflow, not a one-session report. Session-specific examples and numeric anchors belong in `references/`.

## Core principle

FuBlessings should not be priced like generic low-cost stationery, souvenir goods, or mass-market Chinese trinkets. The relevant value stack is:

- real handwritten Chinese calligraphy;
- calligraphy creation and artistic review by Lina Sun;
- personalization / naming / wording help;
- gift scenario and emotional value;
- gift packaging and cross-border fulfillment;
- studio-level presentation, not mass marketplace commodity positioning.

Do not default to recommending price cuts. Lowering price is appropriate only when brand/value proof is weak, competitor anchors are much lower for directly comparable handmade work, or costs require restructuring the SKU.

## Required context before answering

1. Read the workspace brand foundation where available:
   - `<workspace>/BRAND.md`
   - `<workspace>/SHOP.md`
   - `<workspace>/BRAND_MARKETING.md`
2. Read the product Base row(s):
   - SKU
   - current `售价 (HKD)`
   - `成本 (USD)` if present
   - production time, packaging, shipping assumptions, product status
3. Read listing drafts / product docs for positioning, dimensions, materials, and gift occasions.
4. Use public Etsy/search competitor anchors when useful, but label them as directional snippets unless a full competitor report was actually done.

## Fee stress-test model

When exact Etsy account fees are unavailable, label the math as rough and use:

- ordinary Etsy fee estimate: `6.5% transaction + 3% payment processing + $0.25 + $0.20 listing`, about `9.5% + $0.45`;
- optional Offsite Ads stress test: subtract an additional `12–15%`.

State clearly that this excludes materials, packaging, international shipping, labor, rework, exchange-rate loss, and paid ads.

Example formula:

```text
ordinary_net_before_costs = price - (price * 0.095 + 0.45)
offsite_stress_net_before_costs = ordinary_net_before_costs - price * 0.15
```

Use terminal or another calculation tool for arithmetic; do not calculate fee tables mentally.

## Recommended output shape

1. Start with a direct conclusion: reasonable / too low / too high / cannot decide without cost.
2. Explain why brand positioning changes the comparable set.
3. Give SKU-by-SKU judgment with:
   - current price;
   - market anchor range;
   - brand-fit reasoning;
   - short-term recommendation;
   - future test range.
4. Include a fee stress table if prices are known.
5. List missing data needed for exact margin.
6. If the task produced a useful report, save it under `<workspace>/output/pricing-review/`.
7. Do not update Base prices unless the user explicitly confirms after seeing the recommendation.

## Base update safety

Pricing affects money. Unless the user explicitly says to update records, provide analysis only.

If a Base update is requested:

1. Read the current record.
2. Show a diff-style preview: SKU, old price, new price, affected fields.
3. Wait for confirmation.
4. Update only confirmed fields.
5. Re-read the record and report the verified result.

## References

- `references/fublessings-2026-05-22-pricing-review.md` — session example with BM-001, MAG-001, and SCR-001 price bands and fee stress-test caveats.
