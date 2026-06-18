---
name: pinterest-pin-queue-recovery
description: Use when recovering FuBlessings Pinterest Pin Queue rows after publish failures, confirmation failures, duplicate retries, deleted duplicate Pins, or mismatches between Pinterest public URLs and Base status.
layer: application
---

# Pinterest Pin Queue Recovery

Use this skill when a Pinterest Pin Queue row is `失败`/missing `pin_url`, but the publish attempt may have actually created a public Pin, or when a duplicate Pin was created and later deleted.

## Triggers

- User says a failed/retried Pin had already been published.
- A retry creates a new URL, but user deletes it as duplicate.
- Pinterest-autopin reports publish/confirmation failure after clicking publish.
- Pin Queue has `状态 = 失败` with a plausible prior public Pin URL in Pinterest/profile/history.
- Two Pin Queue rows point at the same Pinterest URL and need reconciliation.

## Recovery workflow

1. **Identify the exact row**
   - Read Pin Queue by `pin_id` and get record ID.
   - Capture current `状态`, `pin_url`, `失败原因`, `发布时间`, title, SKU, Board, source asset notes.

2. **De-duplicate before retrying**
   - Do not assume a failed row was not published.
   - Check for an existing public Pin by:
     - user-supplied URL,
     - title / SKU / Board,
     - source asset ID in `备注`,
     - Pinterest profile/board search,
     - other Pin Queue rows with matching URL or similar title/asset.
   - If an existing public Pin is verified, **do not publish again**.

3. **Update the queue when an existing Pin is confirmed**
   - Set `状态 = 已发`.
   - Set `pin_url` to the existing public Pinterest URL.
   - Clear `失败原因`.
   - Preserve or restore the earlier `发布时间` when known.
   - Append a concise `备注` note if a duplicate retry Pin was deleted manually, including the deleted duplicate URL.

4. **Handle duplicate URL conflicts**
   - If the same `pin_url` appears in multiple rows, report the conflict explicitly.
   - Do not silently delete or blank another row; ask or verify which row owns the URL unless the user provided exact correction.

5. **Only retry publish after negative duplicate checks**
   - Reset `状态` to `待发` only after duplicate checks are negative, test mode passes, or the user explicitly asks to retry despite the risk.
   - After final, always read back the row and report Base state, not just CLI stdout.

## Pitfalls

- Board selection/confirmation bugs can produce `失败` even when Pinterest already created a public Pin.
- A public Pin URL discovered by reconciliation may be the correct outcome even if the original publish command exited non-zero.
- Deleting a duplicate Pin on Pinterest does not update Pin Queue automatically; update Base manually and note the deleted duplicate URL.

## Related skills

- `pinterest-autopin` — main queue composition and publishing flow.
- `pinterest-ads-publishing` — Ads Manager carousel/Board picker publishing pitfalls. This skill overlaps intentionally as a recovery sub-umbrella because nested `pinterest-autopin` skills may not always be patchable via `skill_manage`.
