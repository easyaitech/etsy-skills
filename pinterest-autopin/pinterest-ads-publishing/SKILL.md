---
name: pinterest-ads-publishing
description: Use when publishing Pinterest Pins through Pinterest Ads Manager or debugging Pinterest-autopin carousel/Ads Manager publish flows, especially board picker failures, carousel drafts, public pin URL verification, and Pin Queue status recovery.
layer: application
---

# Pinterest Ads Publishing

This skill captures durable operating rules for Pinterest publishing flows that go through Ads Manager, especially carousel pins managed by Pinterest-autopin.

## When to use

Use this when:
- A Pinterest-autopin run uses Ads Manager (`ads.pinterest.com/ads/create`) rather than the organic pin builder.
- A carousel / multi-image Pin is being tested or published.
- The run fails around Board selection, Ads Manager drafts, public `/pin/` URL discovery, or Pin Queue status recovery.

## Core rules

1. **Do not equate Ads Manager draft creation with a published Pin.**
   - A form fill or creative/ad draft created in Ads Manager is not a verifiable organic Pin.
   - Only mark Pin Queue `状态 = 已发` when the tool finds a public `/pin/` URL.
   - If the result is `ads_draft_created_no_public_url`, leave `pin_url` empty, write `状态 = 失败`, and report that Ads Manager created a draft/creative without a public Pin URL.
   - Never click the outer campaign `Publish` button as a workaround unless the user explicitly asks to launch an ad campaign; it may create a real ad campaign rather than an organic Pin.

2. **Carousel runtime should use the Ads create URL.**
   - For multi-image carousel requests, set `creationUrl` to `https://ads.pinterest.com/ads/create/` before check-login/test/final.
   - If runtime JSON still points at `https://www.pinterest.com/pin-creation-tool/`, check-login can fail with `Pinterest create surface not detected`, especially when CDP reuses an Ads Manager tab.

3. **Board dropdown clicks must be verified.**
   - Prefer exact selector `[data-test-id="board-dropdown-select-button"]` for Ads Manager Board selection.
   - Bring the page to front, click the selector, then verify a right-side `[data-test-id="board-picker-flyout"] input` or equivalent right-side Board search input is visible.
   - Do not assume a reported click succeeded. If the right-side board search input is not visible, treat the dropdown as not opened.
   - Avoid filling generic search inputs unless their coordinates are verified to be in the right-side Pin builder; otherwise the script can fill the left campaign targeting Location field.

4. **Retry queue rows deliberately.**
   - Before retrying, read/dry-run the due row and confirm runtime JSON exists.
   - After fixing the underlying issue, run test mode first.
   - Only reset `状态` to `待发` for the same row after test mode passes or after the user explicitly requests a retry.
   - After final failure, read the row back and verify `状态`, `pin_url`, `失败原因`, and `重试次数` before reporting.

## References

- `references/ads-manager-carousel-pitfalls.md` — condensed session-derived pitfalls for Ads Manager carousel publishing and Board picker verification.

## Relationship to existing skills

This overlaps with the existing `pinterest-autopin` umbrella. Prefer patching/using `pinterest-autopin` when skill management can access it; use this skill as the Ads Manager publishing sub-umbrella when the runtime skill cannot be patched directly.
