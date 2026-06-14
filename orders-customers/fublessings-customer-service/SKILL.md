---
name: fublessings-customer-service
description: Use when drafting FuBlessings Etsy buyer replies for inquiries, custom commissions, production-time questions, shipping/returns, reviews, and post-purchase follow-up. Outputs buyer-facing English drafts grounded in BRAND.md and SHOP.md.
layer: workflow
---

# FuBlessings Customer Service

This skill supports Etsy buyer-message drafting for FuBlessings. It is class-level: use it for customer inquiries, custom-commission questions, order status, shipping/returns, review follow-up, and gentle post-purchase messages.

> Overlap note: this skill intentionally overlaps with `orders-customers` customer-reply mode. It was created because `orders-customers` could be loaded but was not editable through `skill_manage` in this runtime. Prefer consolidating this guidance back into `orders-customers` when the curator or maintainer can edit it directly.

## Required grounding

Before drafting any buyer-facing message:
1. Read `<workspace>/BRAND.md` for tone, brand boundaries, and wording rules.
2. Read `<workspace>/SHOP.md` for factual commitments: processing time, shipping time, returns, custom policy.
3. If there is an order/customer context, check the relevant Base before making status claims.
4. Do not send Etsy messages directly; provide the English draft for the user to copy.

## Voice

- Warm, professional, calm, human studio assistant.
- Helpful rather than salesy.
- Usually 100–200 English words; shorter is fine for simple inquiries.
- Emphasize handmade, personal, meaningful, one-of-a-kind gift value.
- Use `we / our studio / the studio team` for studio operations.
- Attribute only the calligraphy creation/artistic judgment to Artist Lina Sun / Calligrapher Lina Sun.

Avoid:
- Overly enthusiastic influencer tone.
- Cold templates like “Dear Sir/Madam”.
- “Master Lina”.
- Mystical / efficacy claims such as brings, attracts, removes, wards off.
- Specific delivery or rush promises not stated in SHOP.md.

## Custom inquiry / production-time questions

Trigger examples:
- “What’s the production time to finish a custom piece?”
- “I can wait for a made-to-order piece.”
- “Can you make this in [word / name / phrase / size / material]?”

Reply structure:
1. Thank them and acknowledge their taste/request warmly.
2. State the production-time fact from SHOP.md: most custom handwritten pieces take about `1–3 days to create and prepare after the details are confirmed`.
3. For complex/larger commissions, say they may take a little longer and the studio will confirm timing before starting. Do not invent a longer fixed number.
4. Invite the buyer to share the word, name, phrase, meaning, recipient, or gift intention.
5. Offer to help shape the request into something personal and meaningful.

Recommended draft pattern:

```text
Hi! Thank you so much — I’m really happy to hear the pieces feel like your style.

For most custom handwritten pieces, our studio usually needs about 1–3 days to create and prepare the piece after the details are confirmed. Since each one is written by hand and made to order, more detailed or larger commissions may take a little longer, but we’ll always let you know before starting.

If you’d like, you can tell me what kind of piece you’re thinking of — the word, name, phrase, or the feeling you’d like it to express — and I’d be happy to help you shape it into something personal.
```

Short version:

```text
Hi! Thank you so much — I’m really glad the pieces feel like your style.

Most custom handwritten pieces take about 1–3 days to create and prepare after the details are confirmed. Since everything is made to order by hand, a more detailed commission may take a little longer, but we’ll always confirm the timing with you first.

Feel free to tell me what word, name, phrase, or meaning you have in mind — I’d be happy to help.
```

## Status / shipping / returns

- For production or shipping status, first check the order record when available.
- Use intervals rather than exact dates unless verified.
- For returns/damage, use the sequence: empathize → understand facts/photos → offer policy-grounded next step.
- Do not promise full refunds, free upgrades, rush shipping, or exceptions without user confirmation.

## After drafting

If the user confirms they sent the message, record the key reply and any customer signal in the relevant order/customer Base when that workflow is active.
