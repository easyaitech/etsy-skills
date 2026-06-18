---
name: etsy-listing-media-consistency
description: Use when Etsy listing media are added, replaced, reordered, or promoted for a FuBlessings SKU and the active photo/video set may affect listing copy, SEO scope, variants, ALT text, or Product Base source-of-truth notes.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [etsy, listing, media, photos, seo, feishu, source-of-truth]
    related_skills: [listing-catalog, etsy-listing-photo-intake, listing-media-source-of-truth, feishu-product-media-operations]
---

# Etsy Listing Media Consistency

## Overview

This skill protects FuBlessings listing quality after media changes. Adding or replacing photos is not only an upload task: the active media set can change what the listing promises. Always align image order, ALT text, Product Base notes, and listing-level copy so buyers are not confused.

## When to Use

Use when:

- New chat images are added to an existing Etsy listing draft/SKU.
- Listing photos are replaced, reordered, or removed.
- Product Base `照片链接`, `照片附件`, or `备注` is updated.
- A new image introduces a different color, style, size, material, accessory, packaging element, or buyer option.

This overlaps with `etsy-listing-photo-intake`, `listing-media-source-of-truth`, and `feishu-product-media-operations`; prefer those when available, but apply this consistency check inside their workflow.

## Required Workflow

1. Read the current SKU row before media changes.
2. Identify the active media set from `照片链接` + current `备注` Image order / Alt Text; treat `照片附件` as historical/preview if physical ordering cannot be controlled.
3. Add/promote sanitized publishing copies through the normal asset-library and Product Base media process.
4. Update `照片链接` in the intended Etsy order.
5. Update `备注` with differentiated ALT text matching the active order.
6. Run a listing-copy consistency check:
   - Does the active media set still match Title?
   - Do tags and SEO keywords over-narrow or over-broaden the product?
   - Does description mention only one color/style while images show multiple options?
   - Do variant/personalization notes explain any newly visible buyer choice?
   - Do images show packaging or props that are not confirmed as included?
7. If the copy mismatch is safe and factually clear, update Title/tags/description/variant notes in the same pass.
8. If the change requires user confirmation or launch decision, keep the SKU as draft and add a prominent Product Base `备注` note plus local markdown note before publishing.
9. Re-read the SKU row and verify attachment count, active link count, image order, ALT text, and consistency note or copy update.

## Pitfall: Red-Only Copy After Adding Multi-Color Photos

If a draft originally says `red bookmark` but new active photos show green/gold/other 6×18 bookmark examples, do not silently leave red-only SEO copy as the listing source of truth.

Safe handling:

- ALT text may name each visible color.
- Listing-level Title/tags/description should move toward broader wording such as `custom tassel bookmark`, `Chinese calligraphy bookmark`, `color options`, or `style options`, if the listing is intended to sell multiple colors.
- If color options are not confirmed, add a note in `备注`: publishing requires copy refresh or user confirmation of whether the listing is red-only or multi-color.

## Verification Checklist

- [ ] Active `照片链接` order matches the intended Etsy order.
- [ ] Current ALT list in `备注` matches the active media order.
- [ ] New media scope changes were checked against Title/tags/description/variants.
- [ ] Any mismatch was either fixed or explicitly recorded as a launch blocker.
- [ ] Final reply distinguishes Product Base/source-of-truth updates from Etsy backend changes unless Etsy was actually updated and verified.
