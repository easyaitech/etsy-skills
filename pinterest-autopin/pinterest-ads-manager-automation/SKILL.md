---
name: pinterest-ads-manager-automation
description: "Debug and harden Pinterest Ads Manager Playwright/browser automation for FuBlessings carousel Pin publishing: right-panel Pin Builder interactions, Board selection, CDP inspection, safe retry, and guards against filling Ads targeting fields."
layer: application
---

# Pinterest Ads Manager Automation

Use this skill when Pinterest AutoPin / Playwright publishing enters Ads Manager (`ads.pinterest.com/.../ads/create`) for carousel Pins and fails around:

- Board dropdown / Board search / selected Board chip
- Right-side Pin 图生成器 / Pin Builder fields
- Left Ads targeting false positives such as `定位详情 > 地点`
- CDP reuse of the user’s live Chrome
- Recovering a failed Pin Queue row after a Playwright fix

This is a companion to `pinterest-autopin`. Prefer updating that umbrella when available; this skill records the Ads Manager-specific automation pitfalls and verification gates.

## Standard workflow

1. Do not close the user’s live Chrome. Reuse the existing CDP endpoint, usually `http://127.0.0.1:9225`.
2. Inspect the live Ads Manager page before changing selectors. Use Playwright/CDP evaluation to collect visible elements, coordinates, `data-test-id`, text, and nearby context.
3. Identify the true semantic panel:
   - Safe target: right-side `Pin 图生成器` / Pin Builder.
   - Dangerous target: left Ads targeting fields (`定位详情`, `地点`, `位置`, `Location`).
4. Patch Playwright only after confirming DOM attributes, visible text, and coordinates on the live page.
5. Add regression tests for selector scope and fail-safe behavior before rerunning `pin:test`.
6. Never treat an Ads draft/preview URL as successful Pin publication; success still requires a real public `/pin/<digits>/` URL or a conservative profile-page reconciliation.

## Board dropdown hardening rules

- Prefer the exact selector `[data-test-id="board-dropdown-select-button"]`.
- Avoid broad selectors such as `[data-test-id*="board"]` for opening the dropdown; they can match placeholder text, board rows, flyout content, or non-actionable elements.
- If `locator.click()` appears to succeed but the flyout does not open, dispatch a full pointer/mouse sequence on the right-panel selector: `pointerdown → mousedown → pointerup → mouseup → click`.
- Avoid unnecessary `scrollIntoView()` before clicking the Board selector; Pinterest’s virtualized Ads layout can shift the Pin Builder and make the next query observe a different state.
- Confirm any Board search input is actually inside the right Pin Builder/flyout. Do not fall back to arbitrary `input[placeholder*="搜索"]` or `input[type="text"]`, because the left Ads targeting `地点` search field can match.
- Important selected-state case: if clicking the Board selector does not expose a Board search input but the requested Board chip/text is already visible inside the right Pin Builder, accept it as selected and continue. Do not fail solely because the Board search box did not open.

## Recovery workflow for a failed Pin Queue row

After fixing a Board-selection or Pin Builder automation bug:

1. Build a CDP-safe runtime JSON by removing `chromeProfile` from the failed Pin runtime request when using the live Chrome CDP path.
2. Run test mode against the exact failed Pin runtime:

```bash
python3 tools/pinterest_publish_pin.py \
  --mode test \
  --no-default-chrome-profile \
  --input /absolute/path/to/PIN-...json \
  --timeout 240
```

3. Confirm stdout passes the Board stage and continues through title, description, link, and alt-text filling.
4. Only after test mode passes, restore the Base row for cron retry:
   - `状态 = 待发`
   - `重试次数 = 0`
   - keep `pin_url` empty
   - write a short `失败原因` note explaining that the automation fix was verified and the row was returned to the queue.
5. Use the auto-publish dry-run script to confirm the row is the next due item before waiting for cron.

## Verification gates

Run at minimum:

```bash
python3 -m unittest tests/test_ads_board_scope.py
npm test
node --check publish_playwright.js
python3 tools/pinterest_publish_pin.py --mode test --no-default-chrome-profile --input <absolute-runtime-pin-json> --timeout 240
```

`pin:test` must pass the Board stage and continue to content fields before a final publish retry is safe.

## Regression tests to keep

Tests should assert that:

- Board search inputs are right-side scoped.
- The failure message still references avoiding `定位详情 > 地点`.
- Broad `[data-test-id*="board"]` dropdown openers are not reintroduced.
- Existing selected Board chip/text in the right Pin Builder is accepted before requiring a search input.
- Board candidate clicks target actionable rows/buttons, not leaf text spans.

## Overlap note

This skill overlaps with the existing nested `pinterest-autopin/pinterest-ads-manager-automation` skill visible via `skill_view`. If both are available, consolidate this content into the nested skill and keep a single class-level Ads Manager automation umbrella.
