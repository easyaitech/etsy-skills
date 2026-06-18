---
name: etsy-listing-live-audit-operations
description: Audit and improve already-live FuBlessings Etsy listings after media/copy updates, especially gift-ready product listings where public-page access may be blocked and Product Base remains the source of truth.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [etsy, listing-audit, live-listing, product-base, media-consistency, fublessings]
    related_skills: [etsy-live-listing-audit, etsy-listing-media-consistency, etsy-listing-optimization, listing-catalog]
---

# Etsy Listing Live Audit Operations

Use this skill when the user says an Etsy listing has been updated/live and asks what problems remain, what to optimize, or whether the listing is ready.

This skill is intentionally class-level: it covers live QA after listing/media/copy changes, not one SKU or one session.

## Required inputs

1. The live Etsy URL or listing ID.
2. Product Base row for the SKU.
3. `BRAND.md` and `SHOP.md`.
4. Public Etsy page if accessible; if blocked, use the fallback below.

## Workflow

1. **Load brand/shop anchors**
   - BRAND: gift-first positioning, no efficacy claims, no `Master`, no one-person-studio implication.
   - SHOP: processing time, shipping, custom-item return boundary.
2. **Read the Product Base row**
   - Verify SKU, title, description, tags, materials, status, price, video, `分享链接`, `照片链接`, `备注`, variations, listing ID.
3. **Try public-page verification**
   - If Etsy blocks with DataDome/captcha, do not claim live-page verification.
   - State the limitation clearly and continue with Product Base + workspace notes.
4. **Normalize live URL**
   - If the user provides a newer Etsy URL/slug for an existing listing ID, update Product Base `分享链接` to that URL while keeping `Etsy Listing ID` unchanged.
   - Re-read/verify after write.
5. **Audit buyer-facing readiness**
   - No placeholder/TODO text.
   - Title under 140 chars; core keyword and personalization appear early.
   - 13 tags, each ≤ 20 chars.
   - Description matches actual contents, personalization, shipping, returns, and visible photos.
   - Image order tells a buyer story: hero → options/variants → gift/inclusions → lifestyle → size/detail/process.
   - Video exists and should be checked in Etsy backend if not publicly accessible.
6. **Report with severity**
   - `总体结论`
   - `必须尽快修正`
   - `建议优化`
   - `后台仍需确认`
   - saved audit file path when non-trivial.

## Gift-set image pitfall

When photos show package components — message letter, envelope, gift packaging, decorative knot, protective packaging, gift card, or similar — treat them as buyer-facing **promises of inclusion**, not props.

Safe wording:

- Use `small decorative knot` if it is packaging decor.
- Use `complimentary gift` only if it is truly an extra item shipped with every order.
- Use `protective packaging`, not `protective package`, for shipping protection.
- Only list packaging components in `Materials` if they are stable contents for every order.

Flag this as high-impact because packaging mismatch creates buyer disappointment even when the product itself is correct.

## Split listing media consistency

For bookmark listings, keep style/size boundaries strict:

- 7 × 21 cm white-margin/color-panel bookmarks should not show 6 × 18 cm solid-color product photos.
- 6 × 18 cm solid-color bookmark listings should not show 7 × 21 cm white-margin/color-panel product photos.
- Historical `照片附件` can contain old or noisy assets; active source of truth is `照片链接` plus `备注` image order / Alt Text.

## Backend fields to list when inaccessible

If public/backend verification is blocked, list these as manual confirmations:

- Actual Etsy image order.
- Alt Text filled for every image.
- Listing video uploaded and visible.
- Variations match style chart.
- Personalization required toggle, prompt, and max character count.
- Processing/shipping profile.
- Custom-item returns display.
- Inventory/quantity, package size/weight.
- Whether shown packaging/props are included.

## Output style

Chinese, concise, operational. Do not rewrite the full listing unless asked; give the highest-impact fixes first.

## Related reference

See `references/live-audit-fallback-and-gift-packaging.md` for the distilled lesson from a live bookmark audit where Etsy public access was blocked and gift-set photos changed the inclusion promise.
