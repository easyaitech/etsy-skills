# Trend Radar local runtime setup notes

Session-derived notes for updating/configuring `easyaitech/etsy-skills` trend-radar in the ETSY Hermes profile.

## Actual paths can differ from prompt paths

User-facing instructions may mention `/Users/johnz/code/etsy-skills`, but in the ETSY Hermes profile the active checkout was:

```text
$HOME/.local/share/etsy-skills
```

Always discover with:

```bash
etsy-stack where
etsy-stack workspace
printf 'HOME=%s HERMES_HOME=%s\n' "$HOME" "$HERMES_HOME"
```

## Required trend-radar files

Confirm after updating main. The v0.1 TypeScript-era trend-radar layout is:

```text
trend-radar/SKILL.md
trend-radar/scripts/trend-fetch
trend-radar/scripts/runner.ts
trend-radar/scripts/sources/google-trends.ts
trend-radar/scripts/package.json
trend-radar/scripts/tsconfig.json
```

Older local notes may mention removed files such as `scripts/trend-radar-run`, `browser-*.mjs`, `aggregate-trend-radar.py`, or `trend-candidates.schema.json`. Treat those as stale unless they exist in the current checkout.

## Validation commands

```bash
python3 -m json.tool etsy-stack.json >/dev/null
node --check trend-radar/scripts/runner.ts
node --check trend-radar/scripts/sources/google-trends.ts
npm --prefix trend-radar/scripts test
trend-fetch --help
```

If `trend-fetch` is symlinked into a bin directory, verify the script resolves `BASH_SOURCE[0]` symlinks; otherwise it may look for `node_modules/.bin/tsx` under the bin directory instead of `trend-radar/scripts/`.

If `npx playwright install chromium` hangs or fails on macOS with `tcsetattr: Inappropriate ioctl for device`, use installed system Chrome as a runtime fallback. Patch the Google Trends source to honor:

```bash
export PLAYWRIGHT_CHROMIUM_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

and pass it as `executablePath` in `chromium.launch(...)`. Verify with `PLAYWRIGHT_CHROMIUM_EXECUTABLE=... trend-fetch --help`, TypeScript check, and tests.

Observed runtime test on 2026-05-18: Google Trends page includes a hidden `grecaptcha-badge` script even when the page is normal, so checking raw HTML for `recaptcha` causes a false `CAPTCHA` failure. Detect CAPTCHA from rendered page text instead (e.g. `unusual traffic`). The current Google Trends frontend may also render useful rows only in the browser text, not as `/trends/explore` anchors in static HTML. Parse `page.locator('body').innerText()` rows matching `keyword / volume / arrow_upward / growth%`, and only fall back to HTML parsing if text parsing returns zero.

Google Trends defaults to 25 rows per page (`Rows per page 25`). To fetch Top 50, collect page 1, click the `Go to next page` button, collect page 2, de-duplicate by lowercase keyword, and slice to 50. Cookie dismissal must try the visible `Got it` button first; a multi-selector `.first()` can select a hidden button and leave the cookie bar blocking data load. Also prefer `waitUntil: "domcontentloaded"` plus a rendered-text wait for `arrow_upward` over `networkidle`, because Google Trends may keep network activity open and time out.

For Chinese-related trends, use the `google-trends-chinese` source. It calls SerpApi `engine=google_trends`, `q=Chinese`, `date=now 7-d`, first with `data_type=RELATED_QUERIES`. Because rising/top related queries can overlap and produce fewer than 50 unique rows, supplement with `data_type=RELATED_TOPICS` until Top 50 is reached. It requires `SERPAPI_KEY` from the Hermes profile env and writes raw SerpApi JSON as evidence; never print or persist the key.

## Playwright/browser workaround in Hermes profile

Observed failures:

```text
Cannot find playwright. Install it or keep tools/Pinterest-autopin/node_modules available.
browserType.launchPersistentContext: Executable doesn't exist at .../ms-playwright/...
```

Working profile-safe runtime exports:

```bash
export PLAYWRIGHT_BASE="$HOME/code/etsy-skills/tools/Pinterest-autopin"
export PLAYWRIGHT_CHROMIUM_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

If upstream scripts lack support, patch both `trend-radar/scripts/browser-*.mjs` to:

- include `process.env.PLAYWRIGHT_BASE` and `process.env.PINTEREST_AUTOPIN_HOME` in `requirePlaywright()` candidates
- pass `executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE` to `chromium.launchPersistentContext()` when set

Also patch `scripts/trend-radar-run` to export these defaults when unset so Hermes cron inherits them.

## Exolyt profile lock

After headed login, close the Chrome instance before headless validation. If it remains open, headless run can fail:

```text
Failed to create a ProcessSingleton for your profile directory
```

Only kill processes whose command line contains the dedicated profile path:

```bash
PROFILE="$ETSY_WORKSPACE/.cache/trend-radar/exolyt-profile"
ps aux | grep -F "$PROFILE" | grep -v grep
```

## Exolyt login_required after manual login

Manual headed login is not enough; verify `raw/exolyt/<run-id>/exolyt-browser.json`. If `status=login_required`, report it and do not fabricate trend data. Possible causes: login did not persist in the dedicated profile, Exolyt requires paid permissions, or page structure changed.

## SerpApi fallback

`SERPAPI_KEY` must be available in Hermes profile env/secret. Do not print or persist the key in repo/report/JSON. If Google Trends fails and no `raw/google-trends/<run-id>/serpapi/` files exist, report fallback did not run because `SERPAPI_KEY` was unavailable.

Observed 2026-05-15 verification in the `etsy-fublessings` profile:

```bash
set -a
. /Users/songchou/.hermes/profiles/etsy-fublessings/.env
set +a
cd /Users/songchou/.hermes/profiles/etsy-fublessings/home/.local/share/etsy-skills
ETSY_WORKSPACE=/Users/songchou/.hermes/profiles/etsy-fublessings/home/workspaces/etsy \
  scripts/trend-radar-run --workspace /Users/songchou/.hermes/profiles/etsy-fublessings/home/workspaces/etsy
```

Expected fallback evidence when browser Google Trends is incomplete:

```text
<trend-radar raw>/google-trends/<RUN_ID>/serpapi/7d-related-queries.json
<trend-radar raw>/google-trends/<RUN_ID>/serpapi/7d-related-topics.json
<trend-radar raw>/google-trends/<RUN_ID>/serpapi/30d-related-queries.json
<trend-radar raw>/google-trends/<RUN_ID>/serpapi/30d-related-topics.json
```

After writing or using a secret, grep the workspace outputs/docs for the literal key and expect no matches; never paste the key into generated markdown/JSON.

## Exolyt login-state repair

If `source_failures` contains `{"source":"exolyt_browser","reason":"login_required"}`, do not ask for the user's Exolyt password. Open a headed Chrome against the exact persistent profile used by the script:

```bash
PROFILE='/Users/songchou/.hermes/profiles/etsy-fublessings/home/workspaces/etsy/.cache/trend-radar/exolyt-profile'
mkdir -p "$PROFILE"
open -na 'Google Chrome' --args \
  --user-data-dir="$PROFILE" \
  --profile-directory=Default \
  'https://app.exolyt.com/auth/login?callbackUrl=%2Fhashtags%2Fchinese'
```

Ask the user to complete login in that browser, then run headed validation first and only then normal headless validation. Observed URL detail: `https://exolyt.com/hashtag/chinese` can return a public 404, while `https://exolyt.com/hashtags/chinese` and `/search?q=Chinese` redirect to `app.exolyt.com/auth/login?...reason=expired` when the profile session is not authenticated.

## Weekly Hermes cron requirements

Cron should source the profile `.env`, export `ETSY_WORKSPACE`, `PLAYWRIGHT_BASE`, and `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, and run:

```bash
cd "$HOME/.local/share/etsy-skills" && scripts/trend-radar-run --workspace "$ETSY_WORKSPACE"
```

Run weekly only; do not schedule high-frequency Google Trends runs. Cron is only allowed to append trend-radar report/data/raw outputs.
