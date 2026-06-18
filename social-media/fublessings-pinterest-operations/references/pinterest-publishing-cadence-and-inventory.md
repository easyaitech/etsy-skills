# Pinterest Publishing Cadence & Queue Inventory

Use this reference when scheduling or monitoring FuBlessings Pinterest publishing.

## Default cadence

User-approved default plan:

- 3 Pins per day total.
- 1 Chinese character meaning / culture-education Pin per day.
  - Usually one character = one 4-image carousel.
  - Main Board: `Chinese Calligraphy Meanings`.
- 2 product / gift-image Pins per day.
  - Single image by default when the user says single-image, every image, or do not combine.
  - Carousel only when the user explicitly groups images or the content is a coherent product/story sequence.
  - Main Board selected by product/category; sync Board remains `Hand-Brushed Chinese Calligraphy Gifts`.

## Board routing

- `Chinese Calligraphy Meanings`: Chinese character meanings, blessing phrase explanations, calligraphy/culture education.
- `The Calligrapher's Studio · Behind the Brush`: studio process, behind-the-scenes, craft/art context. Do not use this as the default for character-meaning education after the new Board exists.
- Product Boards remain product/category driven.

## 3-day safety stock rule

The Pinterest queue should carry at least 3 days of publishable inventory:

- Character meaning Pins >= 3.
- Product/gift-image Pins >= 6.
- Total pending/draft Pins >= 9.

Count only records that are publishable inventory:

- `状态` is `待发` or `草稿`.
- `pin_url` is empty.
- Failed rows do **not** count as available inventory.

If inventory falls below any threshold, remind the user to add materials. Keep the reminder actionable: state current counts and the minimum number of character topics / product Pins needed.

## Watchdog implementation pattern

A no-agent cron can run a deterministic script daily and stay silent when inventory is sufficient.

Current workspace implementation:

- Workspace script: `/Users/songchou/workspaces/etsy/scripts/pinterest_queue_inventory_watch.py`.
- Scheduler copy: profile scripts directory, filename `pinterest_queue_inventory_watch.py`.
- Cron name: `ETSY Pinterest 队列库存不足提醒`.
- Schedule: daily `10:00 CST` (`0 10 * * *`).
- Delivery: origin.
- Silent behavior: empty stdout means no reminder.
- Alert behavior: non-empty stdout is delivered verbatim.

When modifying this watchdog, preserve the no-agent/silent-on-OK pattern. Do not create noisy heartbeat messages.
