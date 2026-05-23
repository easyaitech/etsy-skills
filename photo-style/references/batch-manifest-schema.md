# Batch Manifest Schema

`photo-style` 的 manifest 是平台无关合同。Pinterest、Instagram 或其他下游 adapter 都只能消费 manifest，不直接读处理过程中的临时状态。

## Location

```
<workspace>/.cache/photo-style/batches/{batch_id}/manifest.json
```

## Top-level schema

```json
{
  "schemaVersion": "1.0",
  "batchId": "2026-05-23-xuan-paper-soft-light",
  "createdAt": "2026-05-23T10:00:00.000Z",
  "workspace": "/abs/workspace",
  "style": {
    "name": "xuan-paper-soft-light",
    "mode": "hermes-image2",
    "promptVersion": "hermes-image2-prompt.md",
    "aspectRatio": "3:4"
  },
  "items": []
}
```

## Item schema

```json
{
  "id": "item-001",
  "sourcePath": "/abs/source/IMG_0001.jpg",
  "sourceSha256": "...",
  "sourceMtimeMs": 1779500000000,
  "outputPath": "/abs/workspace/.cache/photo-style/batches/.../generated/IMG_0001_3x4.jpg",
  "status": "pending",
  "qa": {
    "result": "pass",
    "warnings": [],
    "errors": []
  },
  "processing": {
    "mode": "hermes-image2",
    "model": "gpt-image-2",
    "aspectRatio": "3:4",
    "promptVersion": "hermes-image2-prompt.md",
    "generatedAt": "2026-05-23T10:05:00.000Z",
    "sidecarPath": "/abs/workspace/.cache/photo-style/batches/.../generated/IMG_0001_3x4.json"
  },
  "metadata": {
    "sku": "SKU-001",
    "platformTargets": {
      "pinterest": {
        "board": "Gift Ideas",
        "link": "https://etsy.com/listing/123",
        "title": "Custom Chinese Calligraphy Gift",
        "description": "A personalized calligraphy gift...",
        "altText": "A handmade calligraphy bookmark photographed in soft natural light."
      }
    }
  },
  "approval": null,
  "adapterResults": []
}
```

## Status values

```text
pending  -> approved
pending  -> rejected
approved -> queued
approved -> adapter_failed
failed   -> rejected
```

Hard rules:

- `failed` cannot become `approved`.
- `rejected` cannot become `queued`.
- `queued` is terminal in v0.
- Unknown item IDs in approval input are errors, not warnings.

## Metadata input

Optional metadata JSON may be used by the Hermes runbook or approval/payload handoff:

```json
{
  "IMG_0001.jpg": {
    "sku": "SKU-001",
    "platformTargets": {
      "pinterest": {
        "board": "Gift Ideas",
        "link": "https://etsy.com/listing/123",
        "title": "Custom Chinese Calligraphy Gift",
        "description": "A personalized calligraphy gift...",
        "altText": "A handmade calligraphy bookmark photographed in soft natural light."
      }
    }
  }
}
```

Keys are source basenames. If two source files share one basename, the same metadata may apply to both. Avoid duplicate basenames when possible.
