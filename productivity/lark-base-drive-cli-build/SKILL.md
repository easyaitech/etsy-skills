---
name: lark-base-drive-cli-build
summary: Build Feishu/Lark Drive folder trees and Base schemas with lark-cli, including CLI/API quirks found in ETSY workflows.
description: Use when creating or modifying Feishu/Lark Drive folders or Base tables/fields/views via lark-cli, especially for Etsy operational modules like listing catalogs and asset libraries.
---

# Lark Base + Drive CLI Build

Use this skill when creating Feishu/Lark Drive folder structures and Base schemas via `lark-cli`.

## Preconditions

1. Verify CLI and auth:
   ```bash
   command -v lark-cli
   lark-cli --version
   lark-cli auth status
   ```
2. If `auth status` shows `tokenStatus: needs_refresh`, commands may still work, but be ready to re-run login if API calls fail.
3. For workspace-specific work, read existing local docs first, e.g. `README.md`, `BRAND.md`, `SHOP.md`, and any module docs.

## Drive folder creation

Create root folder:

```bash
lark-cli drive +create-folder --name 'FuBlessings-素材库'
```

Create child folder:

```bash
lark-cli drive +create-folder --folder-token <parent_folder_token> --name '1. 摄影'
```

### Drive naming pitfall

`lark-cli drive +create-folder` can fail with exit code `255` when folder names contain `&` (observed with `Logo & 品牌标识`, `物料 & 包装`). Use `and` instead:

- `5. Logo and 品牌标识`
- `6. 物料 and 包装`

### Drive migration / upload pitfalls

Observed while migrating the FuBlessings asset library from an old nested structure to a simplified 5-folder structure:

- `lark-cli drive files list` may fail even with a valid auth token if `space:document:retrieve` is missing. Do not assume folder enumeration is available; create known target folders and move known file tokens, but do **not** bulk-delete or bulk-move unknown old folders without a complete listing.
- `lark-cli drive +search` may require `search:docs:read`. If that scope is missing, fall back to known tokens from local docs and avoid guessing.
- `lark-cli drive +search` query strings can be length-limited (observed max 30 characters). For long filenames, verify with a short unique substring rather than the full filename.
- **Folder token pitfall:** short labels remembered from URLs or screenshots (for example `WX0UfD`) may not be valid upload parent tokens; `drive +upload` can return `1061044 parent node not exist`. Before claiming cloud upload succeeded, use a real folder token discovered via `files list`/`+search` or a verified local doc, run `+upload --dry-run`, then execute and capture the returned file token.
- If scopes are missing, request them explicitly with `lark-cli auth login --scope "space:document:retrieve search:docs:read drive:file:upload"`; the command may block with a device verification URL/user code that the user must approve.
- Use `LARK_CLI_NO_PROXY=1` for Drive/Base reads or uploads when proxy warnings appear and the command is read-only or previously verified. For Base **field/view write** operations, do not assume no-proxy is safer: observed with `@larksuite/cli` 1.0.20/1.0.31 that `LARK_CLI_NO_PROXY=1` can make `+field-create` / `+view-create` return `HTTP 404`, while the default proxy path succeeds. If a Base write returns 404 under no-proxy, retry once without `LARK_CLI_NO_PROXY` after verifying the command shape with `--dry-run`.
- `lark-cli drive +upload` rejects absolute `--file` paths as unsafe. `cd` into the file directory and pass a relative path:
  ```bash
  cd /path/to/local/file-dir
  LARK_CLI_NO_PROXY=1 lark-cli drive +upload \
    --file './logo_primary_transparent.png' \
    --name 'logo_primary_transparent.png' \
    --folder-token <target_folder_token>
  ```
- Move known files by token with explicit type:
  ```bash
  LARK_CLI_NO_PROXY=1 lark-cli drive +move \
    --file-token <file_token> \
    --type file \
    --folder-token <target_folder_token>
  ```
- After moving a Drive file, the file token/link usually stays stable; still verify or update local metadata/docs with the new folder token.
- **Drive upload is not Base indexing:** uploading files into Drive folders does not update any related Base automatically. For asset-library workflows, run the corresponding Base record creation/update immediately after upload, then verify with `+record-search` by `文件名` (or the module's stable key).
- **Duplicate empty Base cleanup:** when the user says unused duplicate Feishu/Lark Bases may be deleted, first discover candidates with `drive +search --doc-types bitable` and/or the relevant folder listing, then compare against local operational docs to identify the canonical active Base tokens. For every deletion candidate, run `base +table-list` and `base +record-list` for each table; only delete if all tables have zero records and the Base is not referenced as the active token in workspace docs/memory. Use `drive +delete --type bitable --dry-run --yes` before the real delete, then verify by re-searching and by checking the deleted token returns `note has been deleted`. Never delete non-empty, active, or ambiguous Bases without an explicit user confirmation naming the token/title.

## Base creation

Create Base:

```bash
lark-cli base +base-create --name 'FuBlessings-商品目录' --time-zone Asia/Shanghai
```

Optionally place it inside a Drive folder:

```bash
lark-cli base +base-create --folder-token <folder_token> --name 'FuBlessings-素材索引' --time-zone Asia/Shanghai
```

New bases usually include one default table. Rename it instead of creating another table:

```bash
lark-cli base +table-list --base-token <base_token>
lark-cli base +table-update --base-token <base_token> --table-id <table_id> --name '商品'
```

## Field type conventions

Use string field types, not numeric codes. Numeric codes like `1` or `3` fail with `Invalid discriminator value`.

Common field JSON:

```json
{"field_name":"SKU","type":"text"}
{"field_name":"状态","type":"select","multiple":false,"options":[{"name":"草稿"},{"name":"待上线"},{"name":"在售"}]}
{"field_name":"Tags","type":"select","multiple":true,"options":[]}
{"field_name":"售价 (USD)","type":"number"}
{"field_name":"上线日","type":"datetime"}
{"field_name":"文件附件","type":"attachment"}
{"field_name":"BRAND 合规","type":"checkbox"}
```

Create field:

```bash
lark-cli base +field-create --base-token <base_token> --table-id <table_id> --json '{"field_name":"SKU","type":"text"}'
```

Update default field:

```bash
lark-cli base +field-update --base-token <base_token> --table-id <table_id> --field-id <field_id> --json '{"field_name":"SKU","type":"text"}'
```

### Field pitfalls

- Feishu/Lark Base primary field (often the default `文本` field) cannot be deleted via `+field-delete`; API returns `The primary field cannot be deleted`. If it is a useless default field, migrate the desired primary value into it, delete the duplicate non-primary field, then rename the primary field (for example: copy `pin_id` values into `文本`, delete the old non-primary `pin_id`, rename `文本` → `pin_id`).
- `number` fields reject unsupported keys like `formatter`; create as `{"type":"number"}` and adjust formatting manually if needed.
- Some non-primary default fields may fail deletion with `800004135 ... OpenAPIDeleteField limited` even when they are not primary (observed with a default attachment field). If deletion is non-essential, rename/reuse the field instead, e.g. `附件` → `附件（可选）`, and document why it remains.
- `link` is a table relation, not a URL field. It requires `link_table`. For ordinary URLs use a `text` field unless a true URL field is confirmed.
- Cross-Base relation fields are not supported in this workflow: `link_table` can only find tables in the current Base. If related data lives in another Base, use a text placeholder like `关联 SKU` and store the SKU string.
- `lark-cli schema ...` may not list Base schemas even though `lark-cli base ...` commands exist; use command help and dry-run instead.

## View creation

```bash
lark-cli base +view-create --base-token <base_token> --table-id <table_id> --json '{"name":"在售","type":"grid"}'
```

Start with basic grid views. Configure filters/sorts later if needed; filter JSON can be finicky and is not required for initial module setup.

## Parsing lark-cli JSON safely

Some commands print warnings before JSON and tips after JSON. Do not use `json.loads(stdout[stdout.find('{'):])` blindly; it can fail with `Extra data`.

Use Python `raw_decode`:

```python
import json
s = stdout
start = s.find('{')
obj, end = json.JSONDecoder().raw_decode(s[start:])
```

## Record upsert workflow

For Etsy module rows, prefer `+record-search` by a stable key (usually `SKU`) before writing, then update by explicit `--record-id` when a row already exists. **Do not rely on `+record-upsert` with only the stable key to update an existing row**: observed behavior with current `lark-cli` can create a duplicate record even when `SKU` matches. If this happens, delete the accidental duplicate with `+record-delete --yes`, then update the intended record by ID.

```bash
lark-cli base +field-list --base-token <base_token> --table-id <table_id>

# 1) Search the stable key and capture record_id_list[0]
lark-cli base +record-search \
  --base-token <base_token> \
  --table-id <table_id> \
  --json '{"keyword":"BM-001","search_fields":["SKU"]}'

# 2A) Existing row: update by explicit record ID
lark-cli base +record-upsert \
  --base-token <base_token> \
  --table-id <table_id> \
  --record-id <existing_record_id> \
  --json '{"SKU":"BM-001","状态":"草稿","品类":"书签","售价 (USD)":29.9}'

# 2B) New row only: omit --record-id to create
lark-cli base +record-upsert \
  --base-token <base_token> \
  --table-id <table_id> \
  --json '{"SKU":"BM-001","状态":"草稿","品类":"书签","售价 (USD)":29.9}'

# If a duplicate was accidentally created during testing, remove it explicitly
lark-cli base +record-delete \
  --base-token <base_token> \
  --table-id <table_id> \
  --record-id <duplicate_record_id> \
  --yes
```

Observed value shapes with current `lark-cli`:

- Single select fields accept a string on input, e.g. `"状态":"草稿"`; returned data may show `["草稿"]`.
- Multi-select fields accept a string array, e.g. `"Tags":["custom bookmark","Chinese calligraphy"]`.
- Number fields accept JSON numbers, e.g. `29.9`.
- Text fields preserve embedded newlines, so long Etsy descriptions can be written directly.
- If `auth status` says `needs_refresh`, Base commands may still succeed; verify with `record-get` after writing.

When `+record-batch-create` hangs or times out with a row containing many multi-select fields, create the record with only stable text/select/checkbox fields first, then patch multi-select fields with `+record-batch-update` by returned record ID. Verify with `+record-get`.

Observed again while creating `business-knowledge` Knowledge Cards: `+record-upsert` can hang indefinitely when a multi-select text field such as `关键词标签` receives many **new** option values across rows. Stable workaround: keep at most one primary tag per row for the first write (or pre-create/select options separately), then patch additional tags later in smaller updates after verifying the row exists. If running through Hermes `execute_code`, avoid nested `hermes_tools.terminal()` loops for many Base writes because a hung CLI call can make the whole Python sandbox time out; write a temporary deterministic script that uses `subprocess.run(..., timeout=...)` and run it with the normal terminal tool.

After writing, always verify with `record-get` using the returned record ID. If the CLI output shape does not expose a record ID, verify by `+record-search` against the stable key (for asset indexes, usually `文件名`) and report the verified count rather than assuming success.

For status checks (read-only questions such as “has this Pin/record been published?”), prefer `+record-search` by the stable key, then `+record-get` on the returned record ID before answering. Do not infer status from local Markdown alone: module docs can lag or disagree with Base fields. For Pinterest Pin Queue specifically, treat `状态`, `pin_url`, `发布时间`, `失败原因`, and `重试次数` as the source-of-truth fields; `pin_url = null` plus no `发布时间` means “not confirmed published” even if local runtime scripts mention a Pinterest URL.

Additional observed pitfalls:

- If a JSON value contains a literal `&` (for example a Pinterest board name like `Bookmarks & Quiet Reading Moments`), Hermes `terminal()` may reject the command as shell backgrounding even when the JSON is quoted. Use `execute_code`/Python with `json.dumps(..., ensure_ascii=False)` + `shlex.quote(...)`, or temporarily write text as `and` if exact wording is not required.
- `lark-cli base +field-list` and `+record-list` output format depends on CLI version. In 1.0.20, `field-list --format json` failed (`unknown flag`) and default output was JSON, but `record-list` behavior changed by 1.0.31: default is Markdown and scripts must pass `--format json`. Always check `lark-cli base +record-list --help` in the live environment before parsing, and prefer `--format json` when supported.
- `+record-batch-update` can return blank output, or even `ok: true` with `updated: 0`, and still change the row in some current lark-cli cases. Always verify with `+record-get`; if unchanged, use `+record-upsert --record-id <record_id> --json '{...}'` for the patch.
- `lark-cli base +record-upload-attachment` has the same unsafe-path behavior as Drive upload: absolute `--file` paths are rejected. `cd` into the cleaned image directory and pass `--file './filename.jpg'`. After uploading listing/product photos, verify the target attachment field with `+record-get` and count filenames; do not claim images are “in Base” from local filenames or Alt Text notes alone.
- Product Base attachment fields may be read-only for normal `+record-batch-update` writes. Observed when replacing a listing image: `照片附件` ignored the attempted overwrite/delete with `READONLY: attachment field cannot be written through OpenAPI`, while `+record-upload-attachment` could only append. In this case, update `照片链接` and `备注` image order/alt text as the authoritative listing sequence, explicitly note that stale attachments are extra previews, and do not delete Drive files unless the user confirms the deletion scope and cross-record impact.
- **Base attachments are not Drive backups.** Files uploaded with `base +record-upload-attachment` appear in the Base attachment field, but do not become searchable/managed files in a Drive folder. `drive +search` may not find the attachment filename, and `drive +download --file-token <base_attachment_file_token>` can return `HTTP 403` because Bitable attachments use media APIs rather than ordinary Drive file download. For Etsy/FuBlessings listing photos, always upload the same publish copy to the asset-library Drive folder first (usually `商品/`, or `待处理/` if unclassified), capture the Drive file token/link, then optionally upload/attach it to the product Base and write the Drive link into `照片链接` or the material index. Do not treat `照片附件` alone as durable cloud-asset backup.
- **Listing photo intake sequence:** for chat-uploaded listing photos, use `Drive first, Base second`. Sanitize/rename publishing copies → `drive +upload` each copy to素材库 `商品/` → verify with `drive files list` in that folder → attach the same copies to Product Base `照片附件` → write the Drive URLs into `照片链接` → verify with `record-get` that link line count and attachment count both match. If a previous run only attached files to Base, backfill Drive upload and `照片链接` immediately before reporting completion.

## Verification

After setup or writes, verify:

```bash
lark-cli base +field-list --base-token <base_token> --table-id <table_id>
lark-cli base +view-list --base-token <base_token> --table-id <table_id>
lark-cli base +record-list --base-token <base_token> --table-id <table_id> --limit 5
lark-cli base +record-get --base-token <base_token> --table-id <table_id> --record-id <record_id>
```

For record list, confirm it is empty or contains only intended seed data.

## Docs creation and media insertion

When converting a local Markdown deliverable into a Feishu/Lark docx, prefer `docs +create --api-version v2`. The v2 flags differ from v1:

```bash
cd /path/to/markdown-dir
LARK_CLI_NO_PROXY=1 lark-cli docs +create \
  --api-version v2 \
  --parent-token <folder_token> \
  --doc-format markdown \
  --content '@./file.md'
```

Pitfalls:

- v1 uses `--folder-token`, `--title`, and `--markdown`; v2 uses `--parent-token`, `--doc-format`, and `--content`.
- `@file` paths must be relative to the current working directory. If you pass an absolute path, lark-cli rejects it as unsafe. `cd` into the file's directory first.
- The Markdown H1 becomes the document title in v2; if a specific title is needed, put it as the first `# Title` line or update title separately if supported.

To insert an image into the created document:

```bash
cd /path/to/image-dir
LARK_CLI_NO_PROXY=1 lark-cli docs +media-insert \
  --doc <document_id_or_url> \
  --type image \
  --file './image.jpg' \
  --caption 'Source image' \
  --align center
```

Verify doc creation with:

```bash
LARK_CLI_NO_PROXY=1 lark-cli docs +fetch --api-version v2 --doc <document_id> \
  -q '.data.document.document_id, .data.document.revision_id'
```

## Documentation

Always write a local Markdown module doc with:

- Base URL, base token, table name, table ID
- Drive root URL/token if applicable
- Field list and view list
- Naming conventions and usage rules
- Known limitations / deferred improvements
- Any Feishu doc URLs created for content drafts or operational references

Security convention: local workspace docs may retain tokens when they are already the operational source of truth, but chat replies, summaries, handoffs, and generated public-facing docs must redact Base tokens, URL tokens, cookies, and credentials as `[REDACTED]`. It is safe to mention non-secret table IDs, record IDs, and human-readable Base/table names.

Update workspace `README.md` with links/tokens so future sessions can resume without rediscovery.

## ETSY module-specific references

- For Feishu Drive asset uploads, see `references/feishu-drive-upload-verification.md` for the cache-vs-cloud distinction, required scopes, folder-token verification, and the reminder that Drive upload does not update Base indexes.
- For promoted asset-library files that need Material Index rows, see `references/asset-index-after-drive-upload.md` for the Drive→Base→verify sequence and FuBlessings logo/icon field conventions.
- For listing/product Base row updates, see `references/listing-base-update-pitfalls.md` for user-auth `lark-cli` fallback, `execute_code` environment-variable visibility, read-back verification fields, stdin parsing pitfalls, and proxy-warning handling.
- For the distinction between Base attachment media and Drive folder files, see `references/base-attachments-vs-drive-files.md`; it documents why `照片附件` alone is not a Drive backup and the required Drive→Base sequence for FuBlessings listing photos.
- For replacing an existing listing photo when Product Base attachments are append-only/read-only through OpenAPI, see `references/listing-photo-replacement-pitfalls.md`; it records the BM-001 red bookmark workflow, short Drive search queries, and the rule that `照片链接` + `备注` become the authoritative listing sequence until stale attachments are manually/API-deleted.
- For the user expectation that every chat-uploaded image is first backed up to the Feishu Drive asset library before downstream Base/queue writes, see `references/chat-image-drive-backup.md`.
- For FuBlessings procurement source maintenance, read `references/etsy-procurement-source-table.md` before editing `FuBlessings-采购管理` / `采购来源`. It records the lean field schema, user corrections (do not restore `物料类型` / `适用场景`), and 1688 purchase-source recording conventions.
- For repeated single-item procurement source entry, use/adapt `scripts/upsert_procurement_source.py`; it searches by 1688 short-link token, upserts, then verifies with `record-get`.
