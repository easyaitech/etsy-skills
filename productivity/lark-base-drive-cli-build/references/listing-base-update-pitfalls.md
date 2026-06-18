# Listing/Base record update pitfalls

Session-derived notes for updating FuBlessings product records in Feishu/Lark Base, especially listing-catalog rows.

## Prefer user-auth `lark-cli` when app OpenAPI lacks scopes

If direct Feishu OpenAPI calls with app credentials return errors such as:

- `99991672 Access denied`
- missing scopes like `bitable:app:readonly`, `bitable:app`, `base:field:read`, `base:record:retrieve`

fall back to the installed user-auth CLI if available:

```bash
command -v lark-cli
lark-cli auth status
lark-cli base +record-search ...
lark-cli base +record-update ...
lark-cli base +record-get ...
```

Use `auth status` to verify `tokenStatus: valid` and record read/update scopes before writing.

## Environment variable visibility differs by tool

`execute_code` may not inherit Feishu/Lark environment variables even when the terminal shell has them. If auth works in the shell but fails in `execute_code` with invalid params or missing IDs/secrets, rerun the credential-dependent action through terminal/lark-cli rather than debugging phantom credential issues.

## Verify after write

After `+record-update`, always run a read-back verification for key fields. For listing rows, verify at least:

- SKU
- Title
- Status
- Tags count = 13
- Materials count = 13
- Description present / expected length
- SEO keywords / variants / notes updated when relevant

If piping `lark-cli ... | python3 - <<'PY'` causes empty stdin / `JSONDecodeError`, call `lark-cli` from Python via `subprocess.run(..., capture_output=True)` and parse `stdout` instead.

## Proxy warning

`lark-cli` may warn that `https_proxy` is set. Do not echo credentials or token values in user-facing summaries. Mention only that a proxy warning appeared if operationally relevant.
