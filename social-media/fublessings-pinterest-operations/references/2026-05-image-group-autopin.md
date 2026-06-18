# 2026-05 image-group AutoPin session notes

Condensed learnings from a FuBlessings Pinterest workflow session.

## What worked

- User sends 4 images with no text → treat as one new carousel task.
- Created processed images under `/Users/songchou/workspaces/etsy/.cache/pinterest-autopin/processed/`.
- Created Runtime JSON under `/Users/songchou/workspaces/etsy/.cache/pinterest-autopin/runtime/`.
- Created local social-media draft under `/Users/songchou/workspaces/etsy/output/social-media/`.
- Wrote one Feishu Pin Queue row per image group.
- Ran `npm run pin:validate -- --input <runtime-json>` before reporting completion.

## Feishu CLI payload quirks

### Upsert

`lark-cli base +record-upsert` single-record payload must be a raw field map:

```json
{
  "pin_id": "PIN-20260522-001",
  "状态": "待发",
  "pin 类型": "轮播"
}
```

Do **not** wrap it as:

```json
{"fields": {"pin_id": "..."}}
```

That fails with: `Record write payload must not be wrapped in fields.`

### Search

Known-good search payload:

```json
{
  "keyword": "PIN-20260522-001",
  "search_fields": ["pin_id"],
  "page_size": 10
}
```

Missing `search_fields` or using unsupported `filter.conditions` schema fails validation.

## Chrome profile lock workaround

If publish fails with `Failed to create a ProcessSingleton for your profile directory` / `SingletonLock: File exists`, do not kill Chrome first. Prefer CDP when `127.0.0.1:9222` is reachable:

1. Copy `{pin_id}.json` to `{pin_id}.cdp.json`.
2. Remove the `chromeProfile` key.
3. Run:

```bash
python3 tools/pinterest_publish_pin.py --mode final --input <runtime/{pin_id}.cdp.json> --no-default-chrome-profile
```

## Brand-specific copy guardrails

- Pin Title / Description should not actively amplify unsupported precise history claims such as `3000 years`.
- Alt Text may objectively describe text that is visibly present in the image.
- For `爱 / 愛` cultural cards, prefer soft interpretive verbs such as `can be read as`, `reflects`, `expresses`, `symbolizes`; avoid magical or causal claims.
