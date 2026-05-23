# Pinterest Adapter

The Pinterest adapter converts approved manifest items into Pin Queue payload rows.

It does not publish. It does not log in. It does not call Pinterest. Publishing remains `pinterest-autopin`.

## Required item fields

Each approved item needs:

- `metadata.sku`
- `metadata.platformTargets.pinterest.board`
- `metadata.platformTargets.pinterest.link`
- `metadata.platformTargets.pinterest.title`
- `metadata.platformTargets.pinterest.description`
- `metadata.platformTargets.pinterest.altText`
- `outputPath` as an absolute path to an existing processed file

Missing fields block that item and leave it `approved`.

## Payload shape

```json
{
  "rows": [
    {
      "pinType": "单图",
      "sku": "SKU-001",
      "board": "Gift Ideas",
      "imagePath": "/abs/processed.jpg",
      "title": "Custom Chinese Calligraphy Gift",
      "description": "...",
      "altText": "...",
      "link": "https://etsy.com/listing/123",
      "sourceManifestItemId": "item-001"
    }
  ],
  "blocked": []
}
```

The skill should preview this payload to the user before writing Pin Queue with `lark-base`.
