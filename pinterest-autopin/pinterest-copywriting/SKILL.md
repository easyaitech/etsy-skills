---
name: pinterest-copywriting
description: Use when generating or reviewing FuBlessings Pinterest Pin titles, descriptions, hashtags/tags, or backfilling queued Pin copy. Focuses on high-intent gift/search context rather than objective product definitions.
layer: application
---

# Pinterest Copywriting

Use this skill whenever creating, reviewing, or updating FuBlessings Pinterest copy: `Title (EN)`, `Description (EN)`, hashtags/tags, and copy-related runtime JSON fields.

This complements `pinterest-autopin`: that skill owns queue composition and publishing; this skill is the copy-quality guard.

## Core rule

Pinterest copy must not merely describe what the object or Chinese character is. It must make the Pin searchable and useful as a gift idea by naming:

1. **Occasion / life event** — Chinese New Year, birthday, graduation, new job, promotion, retirement, housewarming, wedding, anniversary, Mother’s Day, Father’s Day.
2. **Recipient** — mom, dad, parents, grandparents, teacher, mentor, book lover, friend, coworker, newlyweds, someone starting a new chapter.
3. **Gift meaning** — peace year after year, blessing, gratitude, steady love, courage, resilience, harmony, keepsake, a wish carried by hand-brushed words.
4. **Product / culture keyword** — Chinese calligraphy gift, Chinese blessing, hand-brushed calligraphy, personalized bookmark, meaningful cultural gift.

A good Pin answers at least two of these questions, preferably all three:

- What holiday, occasion, or life moment is this for?
- Who is it for?
- What does it mean as a special gift?

## Title rules

- English, ≤100 characters.
- Put the strongest search intent first.
- Include at least one high-intent occasion / recipient / gift keyword.
- Do not use ALL CAPS, sales urgency, or hashtags in the title.

Good patterns:

```text
Chinese New Year Gift for Parents — 岁岁平安 Calligraphy
Book Lover Gift — Personalized Chinese Calligraphy Bookmark
Graduation or New Job Gift — 万事如意 Chinese Blessing
Teacher or Mentor Gift — Hand-Brushed Chinese Calligraphy
```

Avoid:

```text
The Meaning of 伟 in Chinese Calligraphy
Personalized Chinese Calligraphy Bookmark Gift Set
Chinese Character Meaning Card
```

These are too objective and miss the buyer’s search intent.

## Description rules

- English, roughly 35–55 words where possible; up to Pinterest’s safe 200–500 character range is fine.
- First sentence should start from recipient, occasion, or gift moment — not a dictionary definition.
- Explain meaning only insofar as it helps the gift decision.
- Avoid hard-sell CTA: no “Shop now”, “Buy now”, “limited time”, or urgency language.
- End with 3–5 hashtags covering scene, recipient, gift value, and product/culture.

Template:

```text
For {recipient} on {occasion}, this {phrase/product} carries {gift meaning}. Hand-brushed Chinese calligraphy turns it into a keepsake for {relationship/context}.

#{OccasionTag} #{RecipientTag} #{GiftValueTag} #{ProductCultureTag}
```

Example:

```text
For parents, grandparents, or family elders at Chinese New Year or a milestone birthday, 岁岁平安 carries a wish for peace year after year. Hand-brushed Chinese calligraphy turns that blessing into a quiet keepsake for someone you want to protect with words.

#ChineseNewYearGift #GiftForParents #ChineseBlessing #MeaningfulGift
```

## Hashtag / tag mix

Use 4–6 tags. Cover at least three classes:

- Occasion: `#ChineseNewYearGift`, `#GraduationGift`, `#NewJobGift`, `#HousewarmingGift`, `#AnniversaryGift`, `#BookLoverGift`
- Recipient: `#GiftForMom`, `#GiftForDad`, `#GiftForParents`, `#TeacherGift`, `#MentorGift`
- Gift value: `#MeaningfulGift`, `#ThoughtfulGift`, `#PersonalizedGift`, `#KeepsakeGift`
- Product/culture: `#ChineseCalligraphy`, `#ChineseBlessing`, `#CalligraphyGift`, `#PersonalizedBookmark`

Do not rely only on small generic tags such as `#chinesecalligraphy #chinesecharacters #meaningfulgift`.

## Pending queue backfill workflow

When the user corrects Pinterest copy quality:

1. Treat it as a workflow correction, not just a one-off edit.
2. Patch the governing copy rules in the relevant Pinterest skill/reference if accessible.
3. Backfill queued-but-unpublished Pin Queue rows so automation does not publish stale weak copy.
4. Synchronize all three artifacts for each affected Pin:
   - Pin Queue Base `Title (EN)` and `Description (EN)`
   - runtime JSON under `.cache/pinterest-autopin/runtime/{pin_id}.json`
   - local content markdown under `output/social-media/`
5. Run `pin:validate` for every affected runtime JSON before reporting success.

## Brand safety

- Do not imply supernatural effects: avoid attracts, brings wealth, wards off, protects as a literal outcome, feng shui, luck guarantees.
- Do not use “one-person studio” claims.
- Keep the voice light, gift-centered, and culturally explanatory rather than academic.
- For product Pins, use the Product Base `分享链接`; for brand education Pins, `https://fublessings.com` is acceptable.
