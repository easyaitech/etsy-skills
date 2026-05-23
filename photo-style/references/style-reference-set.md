# Style Reference Set

The reference set is a small group of already-approved finished images. It anchors the lightweight edit.

## v0 behavior

`photo-style` does not train a model. It computes simple image stats from the reference set and nudges source photos toward that range:

- brightness
- approximate saturation
- 2:3 canvas fit

This is intentionally boring. The goal is a consistent publish copy, not a new artwork.

## Recommended input

- 5-10 finished reference images.
- Similar product category if possible.
- Avoid mixing radically different styles in one batch.
- Give each reference batch a stable style name, for example `soft-natural-light`.

## Failure behavior

- No reference images: block the batch.
- Unreadable reference image: block the batch.
- Mixed style quality: continue only if the user intentionally chose the set.

## Why not prompt-only style?

Text like "make it warm and premium" drifts. Reference images are a better source of truth.
