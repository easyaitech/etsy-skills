# Marketing Brief Lookup Contract

Marketing Briefs are short-term tactical artifacts.

They do not replace:

- `<workspace>/BRAND.md`
- `<workspace>/SHOP.md`
- `<workspace>/BRAND_MARKETING.md`
- `<workspace>/MARKETING_PLATFORM.md`

## Dependency level

Marketing Brief is `SKIP`.

If no valid brief exists, downstream skills continue their normal workflow.

## Lookup order

1. Resolve workspace.
2. Determine current ISO week `YYYY-WW`.
3. Look under:

   ```text
   <workspace>/knowledge/briefs/YYYY-WW/
   ```

4. Prefer SKU-specific brief.
5. If no SKU brief exists, look for category/channel brief.
6. Skip expired briefs (`Valid until` before today).
7. If multiple valid briefs match, prefer newest generated date.

## Conflict rules

```text
BRAND.md / SHOP.md
  -> BRAND_MARKETING.md / MARKETING_PLATFORM.md
  -> current user instruction
  -> Marketing Brief
  -> Knowledge Cards detail
```

- Brand / shop facts win over brief.
- `MARKETING_PLATFORM.md` wins on platform constraints.
- `BRAND_MARKETING.md` wins on positioning, audience, scene matrix, and red lines.
- User's current explicit instruction wins unless it violates a hard constraint.

## Display rule

Downstream skills must state:

- brief used / not used
- generated date and valid-until date
- adopted angle(s)
- rejected angle(s) and reason

Absence of a brief is not a blocker and should usually stay quiet.
