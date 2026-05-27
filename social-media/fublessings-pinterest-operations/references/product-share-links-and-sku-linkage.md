# Product share links + Pin Queue SKU linkage

Use this when creating Pinterest Pins from Product Base listing images or other product-specific media.

## Rule

For any Pinterest Pin that points to a specific Etsy listing, the outbound URL must come from the Product Base field `分享链接`.

Do not hand-build generic links such as:

```text
https://www.etsy.com/listing/<listing_id>
```

unless `分享链接` is missing and the user has not provided the dedicated share link yet.

## Product Base setup

If the Product Base does not have the field yet, create a text field:

```bash
LARK_CLI_NO_PROXY=1 lark-cli base +field-create \
  --base-token <product_base_token> \
  --table-id <product_table_id> \
  --json '{"name":"分享链接","type":"text"}'
```

Then write the user-provided URL to the product row.

## Places that must be synchronized

When a queued Pin already exists, update all of these to the same URL:

1. Product Base: `分享链接`
2. Pin Queue: `Link`
3. Runtime JSON: `.cache/pinterest-autopin/runtime/{pin_id}.json` → `link`
4. Local content draft under `output/social-media/` if it records a `Link:` line
5. `docs/pinterest-autopin-setup.md` history line, if present

## Pin Queue product linkage

`关联 SKU` in the current Pin Queue is a text traceability field, not a real cross-Base relation. For product-specific Pins, write:

```text
<Sku> | Product Base record <record_id> | Listing ID <listing_id>
```

This lets future agents trace a Pinterest record back to the Product Base row even without a relational field.

## Session examples

- `MAG-001` fridge magnet share link: `https://fublessings.etsy.com/hk-en/listing/4509455908/custom-chinese-calligraphy-fridge-magnet`
- `SCR-001` mini scroll share link: `https://fublessings.etsy.com/hk-en/listing/4510004567/mini-chinese-calligraphy-scroll`
