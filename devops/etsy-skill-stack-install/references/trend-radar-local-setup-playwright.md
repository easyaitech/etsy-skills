# Trend Radar local setup: Playwright / Chrome / Hermes profile notes

Use this when configuring the `trend-radar` skill on the Hermes cron machine.

## Profile-safe repository and workspace discovery

Do not assume the user-facing path in a task prompt exists. In the ETSY Hermes profile, the active stack may live under the profile home:

```bash
etsy-stack where
etsy-stack workspace
printf 'HOME=%s\nHERMES_HOME=%s\n' "$HOME" "${HERMES_HOME:-}"
```

Observed working paths in the ETSY profile:

- etsy-skills repo: `$HOME/.local/share/etsy-skills`
- Etsy workspace: `$HOME/workspaces/etsy`
- user-level `etsy-stack`: `/Users/songchou/.local/bin/etsy-stack`

If the prompt mentions `/Users/johnz/code/etsy-skills`, first verify it exists. If it does not, use `etsy-stack where` rather than creating a second checkout.

## Playwright browser executable pitfall

`npm exec playwright install chromium` can be slow or fail on this machine with CDN connection drops. The scripts may also fail with:

```text
browserType.launchPersistentContext: Executable doesn't exist at .../Library/Caches/ms-playwright/.../Google Chrome for Testing.app/...
Looks like Playwright Test or Playwright was just installed or updated.
Please run: npx playwright install
```

Fast workaround: use the system Chrome executable and pass it through an environment variable.

Patch/ensure both browser scripts support this option:

```js
const context = await chromium.launchPersistentContext(profileDir, {
  headless,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
  viewport: { width: 1440, height: 1100 },
  locale: "en-US",
});
```

Then run with:

```bash
export PLAYWRIGHT_CHROMIUM_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
export ETSY_WORKSPACE="$(etsy-stack workspace)"
cd "$(etsy-stack where)"
scripts/trend-radar-run --workspace "$ETSY_WORKSPACE"
```

For first Exolyt login, if Playwright headed launch is unreliable, initialize the same profile with system Chrome directly:

```bash
PROFILE="$ETSY_WORKSPACE/.cache/trend-radar/exolyt-profile"
mkdir -p "$PROFILE"
open -na "Google Chrome" --args --user-data-dir="$PROFILE" --profile-directory=Default "https://exolyt.com/"
```

Ask the user to log in manually in that Chrome window. Do not request or store the Exolyt password.

## Secret handling

- Do not write `SERPAPI_KEY` to the repo, reports, or JSON.
- Prefer the Hermes profile `.env` / secret env for cron.
- Tool outputs may redact secret presence as `***`; treat that as "set" and do not print the value.

## Re-run validation after patching browser scripts

```bash
cd "$(etsy-stack where)"
python3 -m json.tool etsy-stack.json >/dev/null
python3 -m json.tool trend-radar/assets/trend-candidates.schema.json >/dev/null
bash -n scripts/trend-radar-run
node --check trend-radar/scripts/browser-google-trends.mjs
node --check trend-radar/scripts/browser-exolyt.mjs
python3 -m py_compile \
  trend-radar/scripts/aggregate-trend-radar.py \
  trend-radar/scripts/fetch-serpapi-google-trends.py
```
