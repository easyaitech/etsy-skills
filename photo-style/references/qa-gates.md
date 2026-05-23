# QA Gates

`photo-style` v0 uses Hermes GPT image-2. QA is a two-layer gate: Hermes vision comparison first, then mandatory human approval. There is no local Sharp image-processing fallback.

## Hard fail

- Source image is missing.
- Source image format is unsupported.
- Hermes image generation fails.
- Output file is missing.
- Output aspect ratio is not 3:4.
- Source hash changes during processing.
- Hermes vision says product subject, handwriting, visible names/text, logo, quantity, or object placement changed.
- Hermes vision says the image has red-gold luxury, talisman, feng shui, religious, tourist souvenir, poster, discount, price, or strong CTA feeling.

## Warning

- Source image is very small.
- Source aspect ratio is far from 3:4, so content preservation needs extra review.
- Pinterest target metadata is incomplete.
- Hermes vision is uncertain about tiny handwriting or small marks.

## Pass

- Output exists.
- Output is 3:4.
- Source hash is unchanged.
- Hermes vision comparison finds no content change.
- Style matches the fixed prompt in `hermes-image2-prompt.md`.
- Item has no hard failures.

## Human approval remains mandatory

Hermes vision cannot reliably prove tiny calligraphy text, product edges, material, or name spelling are unchanged. The contact sheet is the final gate.
