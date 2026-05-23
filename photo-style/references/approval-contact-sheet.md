# Approval Contact Sheet

The approval contact sheet is a local HTML artifact generated from `manifest.json`.

## Location

```
<workspace>/.cache/photo-style/batches/{batch_id}/approval.html
<workspace>/.cache/photo-style/batches/{batch_id}/approval-template.json
```

## Requirements

- Show source and processed images side by side.
- Show QA result and warnings.
- Show SKU and Pinterest board/link if present.
- Escape filenames, notes, and metadata before rendering.
- Do not require a server.

## Approval output

The HTML can help the user decide, but the script applies a JSON approval file:

```json
{
  "approved": [],
  "rejected": [
    { "id": "item-002", "reason": "crop feels awkward" }
  ]
}
```

The generated template starts with an empty `approved` list. Add item IDs only after reviewing the contact sheet.

Apply with:

```bash
photo-style apply-approval --manifest manifest.json --approval-file approval.json
```
