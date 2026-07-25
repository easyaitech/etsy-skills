# Data Model: Etsy Listing Read Contract

This feature stores no runtime data. The model below defines the semantic objects a consuming
skill must preserve when interpreting backend results.

## ListingReadRequest

| Field | Meaning | Validation |
|---|---|---|
| `tenantId` | Canonical runtime-bound tenant identity | Comes from configured environment; never a shop name |
| `mode` | `single`, `batch`, or `shop` | Must match the supplied target shape |
| `urls` | Public Listing URLs for single/batch | Public route only; one for single |
| `shopUrl` | Public Etsy shop URL | Public shop mode only |
| `listingIds` | Seller-owned Listing IDs | Admin single/batch only; numeric and unique |
| `maxItems` | Requested shop cap | Public 1–100; admin 1–10 |

## ListingReadSource

| Field | Public value | Admin value |
|---|---|---|
| `kind` | `public_url` | `seller_admin` |
| `authenticated` | `false` | `true` |
| `executor` | `apify` | `browser_extension` |
| `requestedUrl` | Requested public URL | Seller editor URL |
| `canonicalUrl` | Normalized public Listing URL | Seller editor URL |
| `listingId` | Listing identity when exposed | Listing identity |

## VersionedListingResult

| Field | Meaning |
|---|---|
| `schemaVersion` | Must be `etsy-listing-read/v1` |
| `source` | Provenance and execution identity |
| `capturedAt` | Capture timestamp |
| `data` | Standard fields backed by evidence |
| `evidence` | Source path/presence for mapped data |
| `unknown` | Obtained but unmapped source values, including raw value and reason |
| `unavailable` | Fields the upstream source did not expose |
| `excluded` | Fields deliberately omitted for privacy, tracking, size, or scope |
| `errors` | Explicit failures with scope and retryability |
| `completeness` | Counts and status derived from the above categories |

## ListingReadBatch

| Field | Meaning |
|---|---|
| `tool` | `etsy_listing_public_read` or `etsy_listing_admin_read` |
| `mode` | Request mode |
| `requestedCount` | Accepted request cap/count |
| `resultCount` | Returned Listing result count |
| `truncated` | More source records existed than the accepted cap |
| `results` | One versioned result per returned/requested Listing as defined by the backend |
| `errors` | Batch-level errors |

## State and Interpretation

1. A request selects exactly one source authority: public or seller admin.
2. A public start may be internally pending, but consumers only present the terminal result.
3. `complete` means the capture completed without a result error; it does not mean every source
   control was mapped.
4. `partial` remains usable when mapped data exists and limitations are explicit.
5. `failed` is never replaced by Base data or a fabricated empty result.
6. Every obtained source value remains accounted for in `data/evidence`, `unknown`,
   `unavailable`, `excluded`, or `errors`.
