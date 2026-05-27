# Manual Reconcile: public Pin exists but Pin Queue says failed

Use this when the user reports that a `PIN-...` appears successfully published on Pinterest, but the FuBlessings Pin Queue still shows `失败` / missing `pin_url` because the publisher failed to parse or persist the URL.

## Workflow

1. **Find the Pin Queue row**
   - Prefer `lark-cli base +record-search` with raw JSON; this command does **not** accept `--format json` in the observed CLI version.
   - Example shape:
     ```bash
     LARK_CLI_NO_PROXY=1 lark-cli base +record-search \
       --base-token <PIN_QUEUE_BASE> \
       --table-id <PIN_QUEUE_TABLE> \
       --json '{"keyword":"PIN-YYYYMMDD-001","search_fields":["pin_id"],"page_size":10}'
     ```
   - Read `record_id_list[0]` plus fields `状态`, `pin_url`, `发布时间`, `失败原因`, `Title (EN)`.

2. **Verify the public Pinterest URL**
   - If the user gives no URL, inspect the public FuBlessings Pinterest board/profile and match by the Pin title or description.
   - Accept only public URLs of the form `https://...pinterest.com/pin/<digits>/`.
   - Open the URL and verify the page title/description matches the Pin Queue row before marking it published.

3. **Backfill Pin Queue**
   - Update only the target row:
     ```bash
     LARK_CLI_NO_PROXY=1 lark-cli base +record-upsert \
       --base-token <PIN_QUEUE_BASE> \
       --table-id <PIN_QUEUE_TABLE> \
       --record-id <RECORD_ID> \
       --json '{"状态":"已发","pin_url":"https://.../pin/<digits>/","发布时间":"YYYY-MM-DD HH:mm:ss CST","失败原因":null}'
     ```
   - Re-read the row and verify `状态=['已发']`, `pin_url` is the public URL, and `失败原因` is null.
   - Note: Feishu may display the date field with a timezone-shifted raw value; use the local content draft/docs as the human-readable CST record when needed.

4. **Sync local operational docs**
   - Update `docs/pinterest-autopin-setup.md`: queued/failed → published, add `published ... CST` and `pin URL`.
   - Update `output/social-media/*PIN*...md`: `状态：已发`, `发布时间`, `Pin URL`.
   - Re-read both files to verify.

## Pitfalls

- Do not mark success from Ads Manager URLs, campaign URLs, preview URLs, or UUID-like signals. Only public `/pin/<digits>/` URLs count.
- Do not rerun final publish just to fix the table if a public Pin already exists; reconcile the existing Pin instead to avoid duplicates or ad drafts.
- Do not expose Base/table/record tokens in user-facing messages.