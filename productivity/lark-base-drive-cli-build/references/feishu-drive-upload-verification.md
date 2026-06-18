# Feishu Drive upload verification

Use this note when a user expects a file to appear in Feishu/Lark Drive but cannot see it, or when uploading assets that also need Base indexing.

## Lessons captured

- Local cache, decompression, or local workspace copy is not cloud upload. Do not report "uploaded" until `lark-cli drive +upload` succeeds and returns a `file_token`.
- Short folder labels from memory/UI snippets (for example `WX0UfD`) may be insufficient as upload parent tokens. `drive +upload` may fail with `1061044 parent node not exist`. Discover the full token from `drive +search` or `drive files list` first.
- Useful scopes:
  - `search:docs:read` for `drive +search`
  - `space:document:retrieve` for `drive files list`
  - `drive:file:upload` for uploads
- If missing scopes, run:
  ```bash
  lark-cli auth login --scope "space:document:retrieve search:docs:read drive:file:upload"
  ```
  The command may print a device verification URL and user code; wait for user approval, then verify `lark-cli auth status` shows `tokenStatus: valid`.
- `lark-cli drive +upload` rejects absolute `--file` paths. `cd` into the file directory and pass `--file './name.ext'`.
- Uploading to Drive does not update Base rows. For asset-library workflows, create/update the material index Base row after upload and verify with `+record-search` by `文件名`.

## Verification sequence

```bash
# Find root folder
LARK_CLI_NO_PROXY=1 lark-cli drive +search \
  --query 'FuBlessings-素材库' \
  --doc-types folder \
  --page-size 20 \
  --format json

# List children and copy the full folder token, not the shortened display token
LARK_CLI_NO_PROXY=1 lark-cli drive files list \
  --params '{"folder_token":"<root_folder_token>"}' \
  --format json \
  --page-all

# Upload from the file directory
cd /path/to/files
LARK_CLI_NO_PROXY=1 lark-cli drive +upload \
  --file './asset.png' \
  --name 'asset.png' \
  --folder-token '<full_target_folder_token>'

# Verify target folder contains the uploaded file
LARK_CLI_NO_PROXY=1 lark-cli drive files list \
  --params '{"folder_token":"<full_target_folder_token>"}' \
  --format json \
  --page-all

# If the workflow has a Base index, verify the row too
lark-cli base +record-search \
  --base-token <base_token> \
  --table-id <table_id> \
  --json '{"keyword":"asset.png","search_fields":["文件名"]}'
```
