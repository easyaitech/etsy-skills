---
name: fublessings-pricing-shipping-operations
description: Use when checking or updating FuBlessings Etsy Product Base prices, per-product shipping charges, free-shipping status, and related listing/shop policy consistency.
layer: application
---

# FuBlessings Pricing & Shipping Operations

Use this skill when the user asks to review or update Product Base pricing, shipping charges, free-shipping status, or whether Etsy/listing descriptions match current shipping policy.

This is a focused companion to `listing-catalog` and `pricing-strategy`. Prefer those broad skills for full listing writing or price-band strategy; use this skill for operational consistency around money and shipping fields.

## Core rules

- Main price field is `售价 (HKD)`. Do not introduce or rely on `售价 (USD)`.
- Etsy/public pages may show USD, tax-inclusive prices, or converted currency; keep that separate from the Product Base HKD price.
- Do not assume shop-wide free shipping or shop-wide no-free-shipping. Shipping is per product.
- Preferred Product Base fields:
  - `是否包邮` — select, values `是` / `否`.
  - `标准运费 (HKD)` — number.
- `SHOP.md` should describe shipping as per-product / checkout-dependent, not blanket free shipping or blanket paid shipping.

## Workflow: review pricing + shipping consistency

1. Read Product Base schema and target SKU rows.
2. Check these fields at minimum:
   - `SKU`
   - `状态`
   - `售价 (HKD)`
   - `成本 (USD)` if present
   - `是否包邮`
   - `标准运费 (HKD)`
   - `Description (EN)`
   - `分享链接`
3. If shipping fields do not exist and the user is moving away from free shipping, add per-product fields rather than encoding shipping in notes only.
4. Search `Description (EN)` for stale shipping text:
   - `free shipping`
   - `shipping is free`
   - `standard shipping is free`
   - Chinese equivalents such as `包邮` when present in internal fields.
5. For non-free-shipping SKUs, replace stale buyer-facing text with neutral checkout wording, e.g.:

```text
Standard tracked shipping is charged separately at checkout and usually takes around 15 days.
```

Avoid hard-coding HKD 39–45 in English listing descriptions unless the user explicitly wants it; Etsy checkout/currency display should be authoritative.

6. Check `SHOP.md` shipping table. Good shop-level wording:

```text
按商品设置；部分商品可包邮，未包邮商品以商品页 / Etsy 结账页显示的运费为准
```

7. Re-read Product Base after updates and verify:
   - `是否包邮` is correct for each target SKU.
   - `标准运费 (HKD)` is correct for each target SKU.
   - no stale `free shipping` text remains for non-free-shipping SKUs.
   - `SHOP.md` does not imply all products are free shipping or all products are paid shipping.

## Safety

Pricing and shipping affect money and buyer expectations.

- If the user asks for analysis only, do not update Base.
- If the user explicitly says to modify, proceed, but keep changes scoped to confirmed SKUs/fields.
- When the user gives a range such as 39–45 HKD but not exact per-SKU mapping, use exact values only if the mapping is obvious from product size/weight; otherwise ask for the mapping.
- After updates, report what was changed and what still needs Etsy backend synchronization. Product Base / `SHOP.md` changes do not automatically update Etsy shipping profiles.

## Known overlap

This skill overlaps with `listing-catalog` Mode C and `pricing-strategy`. If those skills become patchable in this profile, fold this operational checklist into them and retire this companion skill.
