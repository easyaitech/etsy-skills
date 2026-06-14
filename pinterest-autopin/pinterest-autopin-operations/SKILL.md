---
name: pinterest-autopin-operations
description: Operational troubleshooting for FuBlessings Pinterest AutoPin queue, login/CDP detection, cron behavior, and safe recovery. Use alongside pinterest-autopin when AutoPin login, cron, or live Chrome/CDP behavior is being debugged.
layer: application
---

# Pinterest AutoPin Operations

Use this skill when maintaining or troubleshooting FuBlessings Pinterest AutoPin runtime behavior: login detection, live Chrome/CDP reuse, cron auto-publish, queue inventory, and failed row recovery.

## Dedicated Chrome profile rule

AutoPin does **not** read the user's everyday Chrome login. Pinterest must be logged in inside the AutoPin dedicated Chrome profile.

In the ETSY Hermes profile, `$HOME` can resolve to:

```text
/Users/songchou/.hermes/profiles/etsy-fublessings/home
```

So the effective AutoPin profile is typically:

```text
$HOME/.config/pinterest-autopin/chrome-profile
/Users/songchou/.hermes/profiles/etsy-fublessings/home/.config/pinterest-autopin/chrome-profile
```

Do not assume `/Users/songchou/.config/pinterest-autopin/chrome-profile` or normal Chrome `~/Library/Application Support/Google/Chrome` contains the login AutoPin needs.

## Login detection troubleshooting

If the user says they logged into Pinterest in Chrome but AutoPin reports `Pinterest login required`:

1. Verify whether an AutoPin CDP window is actually running:
   ```bash
   ps aux | grep -i 'pinterest-autopin/chrome-profile\|remote-debugging-port=9225' | grep -v grep
   lsof -nP -iTCP:9225 -sTCP:LISTEN
   ```
2. Probe CDP with proxy variables disabled. Local proxy env vars can make `127.0.0.1:9225` look unreachable:
   ```bash
   env -u ALL_PROXY -u all_proxy -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY \
     curl -s http://127.0.0.1:9225/json/version
   ```
3. If no AutoPin window is running, open the correct profile and keep it open:
   ```bash
   PROFILE="$HOME/.config/pinterest-autopin/chrome-profile"
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --user-data-dir="$PROFILE" \
     --remote-debugging-address=127.0.0.1 \
     --remote-debugging-port=9225 \
     --no-first-run \
     --no-default-browser-check \
     --new-window 'https://www.pinterest.com/'
   ```
4. Ask the user to log in in that dedicated window. Do not close it after login.
5. Recheck using CDP mode and disabled proxy vars:
   ```bash
   cd "$HOME/code/etsy-skills/tools/Pinterest-autopin"
   env -u ALL_PROXY -u all_proxy -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY \
     PINTEREST_AUTOPIN_CDP_PORT=9225 \
     python3 tools/pinterest_publish_pin.py \
       --mode check-login \
       --no-default-chrome-profile \
       --creation-url 'https://ads.pinterest.com/ads/create/'
   ```

## Cron/API false-failure pattern

If AutoPin cron reports `RuntimeError: Connection error`, inspect Hermes agent logs before blaming Pinterest. The failure may be the cron Agent's model/API connection failing after the terminal script already ran, especially if logs show `APIConnectionError` for `openai-codex` or OpenRouter providers.

Verify queue state with:

```bash
python3 scripts/pinterest_auto_publish_due.py --dry-run
```

If dry-run returns `status: no_due`, there is no backlog to manually publish.

## Empty duplicate Base cleanup

For duplicate Feishu/Lark Base cleanup in the FuBlessings workspace:

1. Read module setup docs to identify canonical active Base tokens.
2. Search/list duplicate Base candidates by title.
3. For each candidate, list tables and run `record-list --limit 20` on every table.
4. Delete only if every table has zero records and the token is not referenced as canonical in local docs/memory.
5. Use `drive +delete --type bitable --dry-run --yes` first, then execute `drive +delete --type bitable --yes`.
6. Verify deletion by attempting `base +table-list`; expected deleted response is `note has been deleted`.

## Verification

Before reporting completion:

- State which profile/path/port was checked for Pinterest login.
- State whether CDP was reachable with proxy variables disabled.
- For cleanup, state which Base tokens were deleted and which canonical Bases were preserved.
