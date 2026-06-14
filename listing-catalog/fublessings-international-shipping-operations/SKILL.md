---
name: fublessings-international-shipping-operations
description: Use when analyzing, setting up, or operationally documenting FuBlessings international shipping, especially DDP / Delivered Duty Paid, 4PX/递四方, customs declarations, Etsy shipping profiles, and buyer-facing shipping wording for US-bound orders.
layer: application
---

# FuBlessings International Shipping Operations

Use this skill when the user asks about:

- DDP / Delivered Duty Paid / duties prepaid / tariff prepaid shipping;
- how to ship Etsy orders through 4PX / 递四方 or another China-based logistics provider;
- customs declarations, item names, HS-code preparation, declared values, tracking, carrier names, or Etsy order completion;
- whether shipping cost should be absorbed in `售价 (HKD)` or charged as `标准运费 (HKD)`;
- how to phrase international shipping / customs language in listings or customer replies.

This skill complements `fublessings-pricing-shipping-operations` and `listing-catalog`. If those skills are being used and are patchable, prefer merging this guidance there; keep this as the international-shipping operational reference.

---

## Core principle

DDP is usually **not** an Etsy shop-level switch for China-based FuBlessings. Operationally, DDP means choosing a logistics route that explicitly supports:

- `Delivered Duty Paid`;
- `DDP`;
- `duties prepaid`;
- `tariff prepaid`;
- `seller-paid duties`.

Then reflect the actual DDP cost in Etsy shipping profiles or item pricing. Do not tell the user to look for a generic Etsy “enable DDP” toggle unless Etsy offers a DDP label for the seller country / carrier combination on that order.

---

## Required sequence before updating money fields

1. Ask or help the user obtain the actual logistics route name and quote.
2. Confirm whether the route is truly DDP and whether buyers may still be charged on delivery.
3. Confirm supported weights, dimensions, materials, tracking, tail carrier, and surcharge rules.
4. Only then recommend Product Base updates:
   - `售价 (HKD)` remains the main price field;
   - `是否包邮` stays per SKU;
   - `标准运费 (HKD)` stores buyer-facing shipping charge where applicable.
5. If Etsy shipping profiles need updates, say clearly that Product Base changes do not update Etsy backend automatically.

---

## 4PX / 递四方 Etsy order flow

1. Etsy receives the order.
2. In 4PX / ERP / freight-forwarder system, create a shipment using the buyer shipping address from Etsy.
3. Enter weight, dimensions, declared value, item name, material, quantity, and origin country.
4. Select the route that explicitly says US DDP / duties prepaid / tariff prepaid / Delivered Duty Paid. Do **not** assume every 4PX US route is DDP.
5. Generate and print the label.
6. Hand over the parcel via 4PX pickup, self-drop, or ship-to-warehouse flow.
7. Copy the tracking number back to Etsy order completion.
8. In Etsy carrier field, choose `4PX` / `4PX Express` if available; otherwise choose `Other` and enter `4PX` as carrier name.

---

## Logistics-provider checklist

Before advising price/profile changes, give the user this checklist to send to 4PX or another provider:

```text
我们是 Etsy 中国卖家，从深圳发小件手写书法礼物到美国。请确认是否有美国 DDP / Delivered Duty Paid / 税费预付线路。

需要确认：
1. 买家收货时是否不会再被收关税、清关费或额外手续费？
2. 报价是否已经包含 duties / tariffs / customs handling fee？
3. 支持哪些重量段：100g / 200g / 500g / 1kg / 2kg？
4. 适合纸质书签、冰箱贴、迷你卷轴、手写书法作品吗？
5. 是否全程 tracking？Etsy 是否能识别 tracking？
6. 美国尾程是哪家：USPS / UPS / DHL eCommerce / 其他？
7. 需要哪些申报信息：HS code、英文品名、材质、申报价值、原产地？
8. 如果美国海关补税或买家被二次收费，责任由谁承担？
9. 退回、拒收、破损、延误的赔付规则是什么？
```

---

## Safe customs wording

Avoid mystical, religious, or efficacy language in customs declarations.

| Product | Safer English customs name | Materials |
|---|---|---|
| Bookmark | `Paper bookmark` / `Handwritten paper bookmark` / `Calligraphy bookmark` | `Paper, ink, tassel` |
| Fridge magnet | `Fridge magnet` / `Decorative magnet` / `Paper and magnet craft` | `Paper, magnet, fabric` |
| Mini scroll | `Decorative paper scroll` / `Calligraphy wall scroll` / `Paper wall hanging` | `Paper, ink, fabric, wood` |
| Original artwork | `Original calligraphy artwork` / `Original painting on paper` / `Decorative paper artwork` | `Paper, ink, pigment` |

Avoid: `religious charm`, `lucky charm`, `fortune item`, `feng shui item`, `amulet`, `spell`, or wording that implies wealth/health/protection effects.

---

## Buyer-facing listing language

If DDP is confirmed, use cautious language:

```text
For US orders, we use tracked international shipping with duties prepaid where available, helping reduce the chance of unexpected import charges on delivery.
```

If DDP is not confirmed, use neutral checkout-dependent language:

```text
Standard tracked international shipping is charged separately at checkout. Any import duties, taxes, or customs fees are handled according to the destination country's rules and the shipping service used.
```

Avoid absolute promises unless the logistics provider contract truly guarantees them:

- `No customs fees ever`
- `Tax-free shipping`
- `Guaranteed no import charges`
- `No tariffs`

---

## Pricing implications

- Do not assume shop-wide free shipping.
- Low-ticket items like bookmarks and magnets may need separate shipping because DDP cost can dominate margin.
- Higher-ticket scrolls, couple gifts, original paintings, or mounted artworks can absorb DDP cost more easily, but packaging/insurance must be validated.
- When the user provides a quote table, compute per-SKU shipping recommendations and separate low-ticket vs. high-ticket treatment.

---

## References

- See `references/ddp-4px-us-shipping.md` for condensed session notes, 4PX questions, customs wording, and buyer-facing copy snippets.
