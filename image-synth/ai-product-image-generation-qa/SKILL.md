---
name: ai-product-image-generation-qa
description: QA and workflow rules for AI-generated FuBlessings product images, especially calligraphy/listing/photo-style outputs where product fidelity matters more than visual polish.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [etsy, fublessings, image-generation, qa, product-fidelity, calligraphy]
    related_skills: [photo-style, image-synth, assets-library, listing-catalog]
---

# AI Product Image Generation QA

Use this skill whenever FuBlessings product photos are generated, restyled, or evaluated with AI image tools, especially for `photo-style`, `image-synth`, listing images, Pinterest images, or any request to make a product photo look more professional.

## Core Rule

For FuBlessings calligraphy products, **content fidelity beats visual polish**. A result that looks more premium but changes handwritten characters, names, seals, logo, product holes, edges, quantity, or meaningful placement is a failed output.

## Workflow

1. Identify whether the task is:
   - **Safe edit / photo cleanup**: crop, exposure, white balance, saturation, contrast, sharpening, metadata cleanup.
   - **AI generation / restyling**: image model creates or re-creates pixels.
2. If exact preservation is required, prefer safe edits first.
3. If using AI generation, verify whether the runtime supports a true source-image edit/reference mode.
   - Explicit `reference_image`, image-edit, mask, or comparable parameter: proceed as an edit candidate.
   - Only `prompt + aspect_ratio`: treat as text-to-image / weak-reference generation, not reliable product editing.
4. Generate exactly one candidate unless the user asks for variants.
5. Run vision QA against the source before presenting it as usable.
6. Mark failed candidates `rejected` / `QA fail`; do not promote to assets-library, Pinterest Queue, or listing pipeline.

## FuBlessings Calligraphy QA Checklist

Before approval, compare source vs output:

- Are the Chinese calligraphy characters the same, not AI substitute characters?
- Are names, visible text, seals/stamps, and logo preserved?
- Are holes, borders, paper texture, material color, and product shape preserved?
- Is the number of objects unchanged?
- Are relative placement and composition materially unchanged?
- Is the background illustration or meaningful prop still the same rather than newly invented?
- Did the output only improve lighting/material mood, instead of redesigning the product?
- Does it avoid big red/gold luxury, talisman, feng shui, religious, tourist-souvenir, poster, price, discount, or CTA feelings?

If any identity/content check fails, reject even if the image is aesthetically better.

## Explaining ChatGPT Web vs Hermes Results

If the user asks why ChatGPT web image results look better than Hermes-generated results, explain briefly:

- ChatGPT web may be using a stronger image-edit/reference-image path with tighter source-image constraints.
- The active Hermes image tool may expose only `prompt` and `aspect_ratio`, which behaves more like text-to-image or weak-reference generation.
- For calligraphy products, weak-reference generation often changes text/seals and is not safe for publishing.

Do not frame this as a permanent tool failure. It is a workflow capability check: if a future Hermes runtime exposes true image-edit/reference parameters, this path can be revisited.

## Recommended Defaults

- For official listing-ready calligraphy product images: use safe non-generative edits unless true image-edit fidelity is available.
- For concept/lifestyle/social tests: AI generation is acceptable, but keep outputs in `.cache/` or `ai_raw/` until approved.
- For user-provided good ChatGPT web outputs: ingest them as candidate assets, back them up to Drive, run QA, then route through assets-library / Pin Queue / listing workflows as appropriate.
