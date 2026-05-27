# Feishu folder → Pinterest Pin Queue

Use this reference when the user provides a Feishu/Lark Drive folder URL and asks to put the images into the Pinterest automatic publishing queue.

## Proven workflow

1. Extract the folder token from the URL path, e.g. `https://my.feishu.cn/drive/folder/<folder_token>`.
2. List files:

```bash
LARK_CLI_NO_PROXY=1 lark-cli drive files list \
  --params '{"folder_token":"<folder_token>","page_size":50}' \
  --format json
```

3. Watch for redaction: `lark-cli` may redact the `token` field in human-facing JSON (`ABC...xyz`) while `url` still contains the full file token. If direct token output is redacted, extract the full file token from each `url` (`https://my.feishu.cn/file/<file_token>`).
4. Download files into workspace cache, not profile cache:

```bash
mkdir -p /Users/songchou/workspaces/etsy/.cache/pinterest-autopin/source/<date>_<folder_slug>
LARK_CLI_NO_PROXY=1 lark-cli drive +download \
  --file-token '<file_token>' \
  --output '.cache/pinterest-autopin/source/<date>_<folder_slug>/<filename>' \
  --overwrite
```

5. Sort images by intended carousel order. If files are named `page-1.png` … `page-4.png`, use natural numeric order, not Drive listing order (Drive may return newest first).
6. Optional but helpful: create a contact sheet and run visual analysis before writing Title / Description / Alt Text.
7. Process publishing copies into `.cache/pinterest-autopin/processed/` before Base write:
   - Ensure `remove-ai-watermarks` is callable. If `etsy-stack ai-cleaner update` says installed but status still says missing, add profile local bin to PATH for the command: `export PATH="$HOME/.local/bin:$PATH"`.
   - For PNGs, install/use `optipng` for lossless compression if missing.
   - Run metadata check/remove and then `optipng -o2`. Do **not** run invisible watermark removal unless the user explicitly opts in because it can rewrite text-heavy carousel images.
8. Generate runtime JSON in `.cache/pinterest-autopin/runtime/{pin_id}.json`, local markdown draft under `output/social-media/`, and Pin Queue Base row.
9. Run validate before final response:

```bash
cd /Users/songchou/.hermes/profiles/etsy-fublessings/home/code/etsy-skills/tools/Pinterest-autopin
npm run pin:validate -- --input /Users/songchou/workspaces/etsy/.cache/pinterest-autopin/runtime/{pin_id}.json
```

10. Verify Base row with `lark-cli base +record-list` filtered locally or via `--jq`. Current `+record-list` output is table-shaped (`data.fields`, `data.record_id_list`, `data.data` row arrays), not always item-shaped (`data.items[].fields`). When local parsing, zip `fields` with each row and pair it with `record_id_list`; when using `--jq`, first confirm the actual output shape instead of assuming `.data.items[]`.
11. `lark-cli base +record-upsert` does not accept `--format json`; omit that flag. It prints JSON by default. If a command fails with `unknown flag: --format`, retry without it rather than changing the payload.

## Notes from 2026-05-23

- A four-image folder `page-1.png`–`page-4.png` was queued as one carousel `PIN-20260526-001`.
- `drive files list` returned files in reverse page order (`page-4` first), so natural filename sorting was needed.
- `remove-ai-watermarks` installed into the ETSY profile home local bin; current shell needed `PATH="$HOME/.local/bin:$PATH"`.
