# Listing Read Skill Contract

## Routing

| User intent | Required route | Forbidden fallback |
|---|---|---|
| Read a public Listing URL | Public read | Seller browser, Base-as-live-source |
| Read public Listing URLs in bulk | Public batch | Seller browser |
| Enumerate a public shop | Public shop | Seller browser |
| Read an owned Listing's seller configuration | Admin read | Public-only result presented as full admin state |
| Read owned Listings in bulk | Admin batch | Public scraper presented as admin state |
| Enumerate the owned shop editor | Admin shop | Automatic or scheduled execution |

## Limits

- Public: maximum 100 items per call, two concurrent calls per tenant, default rolling limit of
  300 items per 24 hours.
- Admin: maximum 10 items per call, rolling limit of 30 items per 24 hours, sequential reads with
  3–8 seconds between Listings.
- Public transport may poll internally for up to 320 seconds. Intermediate request IDs and
  pending states are not user-facing results.

## Authority and Safety

- The canonical tenant identity comes from the configured runtime binding.
- Public reads do not use the seller's browser account.
- Admin reads require explicit seller intent and an authorized browser extension.
- Admin execution stops on login loss, challenge, rate limiting, quota exhaustion, or plugin
  failure.
- Neither route reads from or writes to Base.
- Neither route writes to Etsy.

## Output

The final output uses `etsy-listing-read/v1`. Consumers must preserve provenance, real mapped
values, evidence, unknown/raw values, unavailable fields, exclusions, errors, and completeness
counts. Missing fields must not be replaced with invented empty values.

## Failure

- A transport or upstream failure remains an explicit failed result.
- A partial result may be used only with its limitations visible.
- A `complete` result may still contain unknown controls; unknown is explicit coverage, not
  silent omission.
- Base or user-provided text may be used as separately labeled planning context, never as proof
  that the current Etsy page contains the same value.
