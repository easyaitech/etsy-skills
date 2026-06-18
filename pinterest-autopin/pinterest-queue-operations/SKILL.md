---
name: pinterest-queue-operations
description: "Use when maintaining FuBlessings Pinterest Pin Queue operations: automatic publish cadence, queue inventory safety stock, backlog recovery scheduling, and cron/runtime script alignment."
layer: application
---

# Pinterest Queue Operations

Use this skill when adjusting or validating FuBlessings Pinterest Pin Queue automation, especially queue inventory alerts, automatic publish cadence, backlog recovery, or cron/runtime script copies.

This is a class-level operations skill. It complements `pinterest-autopin` (composition/publishing flow) and `pinterest-ads-publishing` (Ads Manager publish/browser pitfalls).

## Core cadence

FuBlessings Pinterest default cadence is **2 Pins/day**:

- 1 Hanzi explanation / educational Pin
- 1 product or gift Pin

Product/gift images are planned at **1 per day**. Do not compute product-image usage as 2/day.

## Three-day safety stock

Use a 3-day buffer:

- Hanzi explanation queued/draft rows: at least 3
- Product/gift queued/draft rows: at least 3
- Total queued/draft rows: at least 6

When product/gift rows are missing, report the product/gift gap against 3, not 6.

## Backlog recovery scheduling

If Hermes/cron downtime leaves multiple overdue rows:

1. Keep the earliest overdue row eligible for immediate publish.
2. Move remaining overdue rows after existing future queue rows.
3. Use two North-America-friendly daily slots for the default 2/day cadence:
   - 09:30 EDT
   - 20:30 EDT
4. Do not revive rows already marked `失败` or rows with `pin_url` already set.

## Script alignment checklist

When changing cadence or thresholds, inspect and update both repo and runtime copies as applicable:

- `scripts/pinterest_queue_inventory_watch.py`
  - Expected logic: `DAILY_HANZI = 1`, `DAILY_PRODUCT = 1`, 3-day thresholds = Hanzi 3 / Product 3 / Total 6.
- `scripts/pinterest_auto_publish_due.py`
  - Backlog recovery should use 2 daily slots, not 3.
- `~/.hermes/profiles/etsy-fublessings/scripts/pinterest_queue_inventory_watch.py`
  - Cron may run this profile copy; keep it in sync with repo logic when relevant.

## Cron timeout pitfall

Hermes `no_agent=True` script-only cron runs can time out around 120s, which is too short for Pinterest/Playwright final publish. If AutoPin publishes successfully but the cron reports `Script timed out after 120s`, convert the AutoPin cron to an agent-driven job with `script` cleared, `no_agent=False`, `enabled_toolsets=["terminal"]`, and a self-contained prompt that runs `python3 scripts/pinterest_auto_publish_due.py` via the terminal tool with `timeout=600`. Keep inventory-watch cron jobs script-only because they are short and should stay silent on empty stdout.

## Verification

After edits, verify before reporting:

- Python syntax check passes.
- Inventory check output reflects product threshold 3 and total threshold 6.
- Auto-publish dry-run does not reschedule backlog as 3 Pins/day.
- Profile reconciliation must not assign a public URL to a Pin Queue row unless the profile card/detail matches the target row title/link. Even when there is only one unknown public URL, treat a title/alt mismatch as manual review instead of auto-backfilling.
- Final user-facing summary states the new cadence and any remaining inventory gaps.

## Related skills

- `pinterest-autopin` — primary composition and publish queue flow. It may be nested and not always patchable via `skill_manage`; use this operations skill for cadence/inventory learnings.
- `pinterest-ads-publishing` — Ads Manager publishing/browser automation pitfalls.
- `pinterest-pin-queue-recovery` — recovering failed/missing URL rows after publish attempts.
