---
name: etsy-digital-printables
description: Analyze, package, and prepare Etsy digital printable products such as coloring books, quote pages, worksheets, Canva PDF exports, and printable bundles.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [etsy, digital-products, printables, coloring-books, pdf, canva, listing-strategy]
    related_skills: [ocr-and-documents, etsy-shop-merchandising, listing-catalog]
---

# Etsy Digital Printables

## Overview

Use this skill when reviewing or preparing Etsy digital printable products: coloring books, mini coloring books, quote page sets, printable PDFs, worksheet packs, Canva exports, instant-download products, and printable bundles.

This skill is for product strategy and listing readiness. Use `ocr-and-documents` for PDF extraction/rendering, then apply this skill for Etsy-facing judgment.

## When to Use

Use when the user asks:

- “Analyze these PDFs / printables / coloring books.”
- “Are these good for Etsy?”
- “Which of these should I publish first?”
- “How should I package these digital products?”
- “Review my Canva coloring book.”
- “What should the strategy be for these printable books?”

Do not use for FuBlessings physical calligraphy product photos unless the asset is specifically a digital printable product.

## Required Inputs

Before making a final recommendation, gather or infer:

1. PDF/page count.
2. Cover preview.
3. Interior page previews/contact sheet.
4. Visible text/quotes and any layout issues.
5. Intended buyer and niche.
6. Whether the product is standalone, mini product, bonus, or bundle.

If only a PDF is provided, render pages to images and a contact sheet first via `ocr-and-documents`.

## Review Workflow

1. **Extract basic PDF facts**
   - Page count.
   - Title/metadata if relevant.
   - Text snippets from pages, if extractable.

2. **Render a visual contact sheet**
   - Review the document visually, not only by text.
   - Look for cover strength, consistency, readability, and weak pages.

3. **Assess Etsy readiness**
   - Is the niche clear at first glance?
   - Does the cover communicate the product instantly?
   - Are the interior pages consistent enough to belong in one product?
   - Is the page count enough for the promised product type?
   - Are there layout/text problems that would hurt reviews?

4. **Rank the product direction**
   - Strongest commercial direction.
   - Most original/brandable direction.
   - Strongest pages.
   - Weakest pages to revise.
   - Whether to sell standalone, bundle, mini sampler, or free bonus.

5. **Give execution advice**
   - Recommended product title angle.
   - Target buyer.
   - Keywords/niche terms.
   - Required listing mockups.
   - Minimum fixes before publishing.

## Page Count Guidance

For Etsy coloring books/printable packs:

- **Under 10 coloring pages**: usually too thin as a standalone paid product unless clearly labeled as a mini sampler or priced very low.
- **10–19 pages**: can work as a mini book, bonus pack, or low-priced bundle component, but should not be presented as a full coloring book.
- **20–30 pages**: safer minimum for a standalone printable coloring book.
- **30+ pages**: stronger perceived value, especially for adult coloring / relaxation niches.

Always be explicit: if a product is small, recommend positioning it as `mini`, `sample`, `bonus`, or bundling it with related PDFs rather than overselling it.

## Visual QA Checklist

For each PDF/product, check:

- Cover: clear title, niche, audience, and visual hook.
- Interior consistency: same illustration style, line weight, border style, and mood.
- Readability: quotes should be legible in preview thumbnails and printable size.
- Text layout: no orphan words, awkward line breaks, wrong word order, or cramped letters.
- Coloring usability: enough open spaces; not too dense for the claimed age/audience.
- Buyer promise: cover and listing should match the actual interior style.
- Differentiation: avoid looking like a generic AI/Canva content dump.

## Common Positioning Patterns

### Mini book

Use when page count is low but quality is acceptable.

Buyer-facing language:

- `Mini Coloring Book`
- `Printable Mini Coloring Pages`
- `Small Coloring Page Set`

### Bundle

Use when multiple small PDFs can make one stronger product.

Buyer-facing language:

- `Cozy Kawaii Coloring Book Bundle`
- `Printable Coloring Pages Bundle`
- `Coffee & Cottagecore Coloring Book Set`

### Full standalone product

Use only when the page count and consistency support it.

Buyer-facing language:

- `Kawaii Coffee Break Coloring Book`
- `Cozy Mushroom Coloring Book`
- `Cute Food Coloring Pages for Relaxation`

## Listing Assets Needed

Before launch, recommend at least:

1. Cover mockup.
2. Interior page preview collage.
3. “Instant Download PDF” explanation graphic.
4. Page count / file format / print size graphic.
5. Personal-use/license reminder.

## Output Style

When replying to the user:

- Start with the direct verdict.
- Compare products if multiple files were provided.
- Name the strongest and weakest pages.
- Give publish/no-publish guidance.
- Keep the recommendation practical: what to fix, what to expand, what to list first.
- If the user uses Turkish, answer in Turkish unless they requested another language.

## Compliance / Quality Notes

- Do not imply a physical item ships if this is an instant download.
- Always mention page count honestly in listing copy.
- If the file is AI-generated or Canva-generated, focus on buyer-visible quality and originality; do not make unsupported claims about handmade artwork.
- Avoid using trademarked characters, brands, or protected IP themes.

## References

- `references/pdf-coloring-book-review-20260526.md` — example review pattern for two Canva-style PDF coloring books: page-count judgment, strongest/weakest pages, bundle vs standalone recommendation.
