---
name: etsy-skill-stack-install
description: Use when installing or updating easyaitech/etsy-skills releases into the ETSY Hermes profile. Covers profile-safe HERMES_SKILLS_DIR, release/tag cloning, etsy-stack verification, and known v0.1.0 install/CLI pitfalls.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [etsy, skills, install, hermes-profile, github-release]
    related_skills: [hermes-agent, hermes-agent-skill-authoring]
---

# ETSY Skill Stack Install

## Overview

This skill captures the profile-safe workflow for installing the `easyaitech/etsy-skills` bundle into the ETSY Hermes profile. The bundle is released on GitHub and installs a set of Etsy operations skills plus an `etsy-stack` helper CLI.

Use this instead of blindly piping `curl | bash` when working inside the ETSY profile, because `$HOME` points to the profile home while the active skills directory is `$HERMES_HOME/skills`.

## When to Use

- User asks to install or update `https://github.com/easyaitech/etsy-skills` or a release tag such as `v0.1.0`.
- User asks to reinstall the Etsy skill bundle after deleting one of the included skills.
- `etsy-stack list` shows skills as missing even though symlinks exist.
- Need to verify which Etsy stack skills are currently installed.

Do not use for general Hermes skill hub installs unless the target is specifically the `easyaitech/etsy-skills` bundle.

## Prerequisite Context

For the ETSY profile, verify live values before installing:

```bash
printf 'HOME=%s\nHERMES_HOME=%s\n' "$HOME" "${HERMES_HOME:-}"
hermes config path
```

Expected shape in this profile:

- `$HOME` is profile-local, e.g. `~/.hermes/profiles/etsy-fublessings/home`
- `$HERMES_HOME` is profile root, e.g. `~/.hermes/profiles/etsy-fublessings`
- Correct skills destination is `$HERMES_HOME/skills`, not `$HOME/.hermes/skills`

## Source-of-Truth / Update Convention

For code changes to the Etsy skill stack, the source of truth is the GitHub repository `easyaitech/etsy-skills`. Do not treat ad-hoc local profile edits as the update channel. Make code changes in a clean repo checkout/worktree, commit/push to `easyaitech/etsy-skills`, then sync the ETSY profile from that repository and verify with `etsy-stack check` / `etsy-stack list`.

### Mandatory GitHub workflow for `etsy-skills` code changes

The user's current rule is strict: `origin/main` is the **only** source of truth, and Hermes runtime install directories are never a place to hand-edit code.

1. Start from a clean repository checkout/worktree that tracks `easyaitech/etsy-skills`; do not edit `$HOME/.local/share/etsy-skills`, `$HERMES_HOME/skills`, or other runtime install locations.
2. Fetch/verify `origin/main`, then confirm `git status --short --untracked-files=all` is empty. If there are local modifications, untracked business files, merge conflicts, or a non-fast-forward situation, stop and report instead of cleaning up automatically.
3. Never modify or commit on `main`. Create a feature branch from `origin/main` named `codex/hermes-<short-task>`.
4. Make only the task-scoped changes.
5. Stage explicit task-related paths only; never use `git add -A`.
6. Run relevant tests and static checks before finalizing.
7. Push only the feature branch and create a PR. Do not merge directly.
8. After the PR is merged, update Hermes runtime via `install.sh` from `main` or a release tag; do not patch runtime code by hand as the deployment path.

### Hermes/Codex parallel repo-safety rule

When Hermes Agent and Codex may both modify GitHub repositories, treat `origin/main` as the only source of truth and avoid sharing a dirty checkout:

- Do not directly modify/commit `main`.
- Start each code task from `origin/main` on a feature branch named `codex/hermes-<task>`.
- Before editing, require `git status --short --untracked-files=all` to be clean. If dirty, stop and report instead of “cleaning up” automatically.
- Use an independent clone or git worktree for code changes; do not hand-edit Hermes runtime install directories as the development source or deployment shortcut.
- Stage only task-related files; never use `git add -A`.
- Run relevant tests/static checks before pushing.
- Push only the feature branch and open a PR.
- Stop and report on merge conflicts, non-fast-forward pulls, or untracked business/runtime files.
- Runtime/profile/config/cron/memory/cache/log changes are operational updates, not PR-based code changes.

## Recommended Install Workflow

1. Inspect workspace context first, per ETSY persona:

```bash
# Prefer file/search tools for this in-agent; shell shown for human reference
pwd
# resolve ETSY_WORKSPACE per shop-foundation §工作区路径解析, then read "$ETSY_WORKSPACE/README.md" if present
```

2. Resolve the release/tag with git. Git over HTTPS may work even when `web_extract` or GitHub API access fails:

```bash
git ls-remote --tags https://github.com/easyaitech/etsy-skills.git 'refs/tags/v0.1.0'
```

3. Clone the exact release to a temporary review directory:

```bash
rm -rf /tmp/etsy-skills-v0.1.0
git clone --depth 1 --branch v0.1.0 https://github.com/easyaitech/etsy-skills.git /tmp/etsy-skills-v0.1.0
```

4. Review the installer and manifest before running:

```bash
# Use read_file in-agent instead of cat
# /tmp/etsy-skills-v0.1.0/install.sh
# /tmp/etsy-skills-v0.1.0/etsy-stack.json
# /tmp/etsy-skills-v0.1.0/CHANGELOG.md
```

5. Install into the active Hermes profile with an explicit skills directory:

```bash
ETSY_SKILLS_REF=v0.1.0 \
HERMES_SKILLS_DIR="$HERMES_HOME/skills" \
bash /tmp/etsy-skills-v0.1.0/install.sh
```

6. Verify symlinks and loaded skills:

```bash
for s in shop-foundation listing-catalog orders-customers assets-library pinterest-autopin; do
  [ -L "$HERMES_HOME/skills/$s" ] && printf 'OK %s -> %s\n' "$s" "$(readlink "$HERMES_HOME/skills/$s")" || printf 'MISSING %s\n' "$s"
done
```

Then load/inspect skills with `skill_view` for each installed skill if current-session verification is needed.

7. Ensure `etsy-stack` is executable from the normal user PATH. The installer puts it under profile-local `$HOME/.local/bin`, which may not be on this runtime PATH. Link it to the real user-local bin if needed:

```bash
ETSY_STACK_BIN="${ETSY_STACK_BIN:-$HOME/.local/bin}"
mkdir -p "$ETSY_STACK_BIN"
ln -sfn "$HOME/.local/share/etsy-skills/scripts/etsy-stack" "$ETSY_STACK_BIN/etsy-stack"
command -v etsy-stack
etsy-stack version
```

## Known Pitfalls

### Dirty runtime checkout requires explicit stop/confirmation

The user's current GitHub-code collaboration rule also applies when updating `etsy-skills`: if the local runtime checkout has modified files, untracked business files, merge conflicts, or a non-fast-forward situation, do **not** blindly reset/update. First report the dirty status and stop for confirmation. It is acceptable to create a non-destructive diff backup before stopping, but destructive cleanup such as `git reset --hard` / `git clean -fd` requires explicit user approval because Hermes Agent and Codex may be working in parallel.

### Local changes can block tag upgrades

Observed when upgrading from `v0.1.0` to `v0.1.4`: local runtime patches and ad-hoc source edits caused checkout failure:

```text
error: Your local changes to the following files would be overwritten by checkout
```

Safe workflow: save a diff backup under the Etsy workspace before resetting the source checkout, then install the exact tag again:

```bash
INSTALL="$HOME/.local/share/etsy-skills"
BACKUP_DIR="$HOME/workspaces/etsy/.hermes/backups/etsy-skills-update-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
git -C "$INSTALL" diff > "$BACKUP_DIR/local-changes.patch"
git -C "$INSTALL" reset --hard
git -C "$INSTALL" clean -fd
ETSY_SKILLS_REF=v0.1.4 HERMES_SKILLS_DIR="$HERMES_HOME/skills" ETSY_STACK_BIN="${ETSY_STACK_BIN:-$HOME/.local/bin}" bash /tmp/etsy-skills-v0.1.4/install.sh
```

### Installer can fail at final message after successful install

Observed on `v0.1.0`: installer completed clone, symlinks, CLI link, and `.installed-version`, then exited with:

```text
line 107: INSTALLED�: unbound variable
```

Treat this as a final-hint bug if verification passes. Check:

```bash
cat "$HOME/.local/share/etsy-skills/.installed-version"
```

Expected: `v0.1.0`.

### `etsy-stack list` may report missing skills in profile installs

The v0.1.0 `scripts/etsy-stack` defaults:

```bash
HERMES_SKILLS_DIR="${HERMES_SKILLS_DIR:-$HOME/.hermes/skills}"
```

In the ETSY profile, skills actually live at `$HERMES_HOME/skills`, so `etsy-stack list` can show all skills as `✗ 未安装` even when symlinks are correct.

Local runtime fix:

```bash
# Prefer patch tool in-agent
# Replace in ~/.local/share/etsy-skills/scripts/etsy-stack:
HERMES_SKILLS_DIR="${HERMES_SKILLS_DIR:-${HERMES_HOME:-$HOME/.hermes}/skills}"
```

Then relink the CLI if needed and verify:

```bash
ETSY_STACK_BIN="${ETSY_STACK_BIN:-$HOME/.local/bin}"
mkdir -p "$ETSY_STACK_BIN"
ln -sfn "$HOME/.local/share/etsy-skills/scripts/etsy-stack" "$ETSY_STACK_BIN/etsy-stack"
etsy-stack list
```

Expected for v0.1.0:

```text
✓ shop-foundation
✓ listing-catalog
✓ orders-customers
✓ assets-library
✓ pinterest-autopin
```

### `check-update.sh` can fail on cached/latest variable expansion

Observed on `v0.1.0` when running the skill startup check:

```text
scripts/check-update.sh: line 25: latest�: unbound variable
```

Cause: adjacent Bash variable expansion in a UTF-8/CJK string can be parsed incorrectly in this runtime. Patch the update hint to use braces:

```bash
# Prefer patch tool in-agent
# Replace in ~/.local/share/etsy-skills/scripts/check-update.sh:
echo "💡 Etsy stack 有新版本：${current} → ${latest}（运行 \`etsy-stack update\` 升级）"
```

After patching, verify:

```bash
bash ~/.local/share/etsy-skills/scripts/check-update.sh || true
```

A normal output may be either silent/no output or a one-line update hint such as:

```text
💡 Etsy stack 有新版本：v0.1.0 → v0.1.1（运行 `etsy-stack update` 升级）
```

If the same unbound-variable issue appears in `install.sh` final output (`INSTALLED�`), patch the final hint similarly:

```bash
ok "安装完成（版本：${INSTALLED}）"
```

In `v0.1.4`, the same runtime also surfaced in `etsy-stack check` at the current-version line:

```bash
echo "✓ 已是最新（当前：${current}）"
```

Observed again while upgrading to `v0.3.0`: install completed symlink/CLI steps but failed at the final success line with `INSTALLED�: unbound variable`. Treat as successful only after verification passes, then patch the runtime checkout:

```bash
# install.sh
HERMES_SKILLS_DIR="${HERMES_SKILLS_DIR:-${HERMES_HOME:-$HOME/.hermes}/skills}"
ok "安装完成（版本：${INSTALLED}）"

# scripts/etsy-stack
HERMES_SKILLS_DIR="${HERMES_SKILLS_DIR:-${HERMES_HOME:-$HOME/.hermes}/skills}"
echo "✓ 已是最新（当前：${current}）"

# scripts/check-update.sh: brace variables adjacent to CJK/emoji text
echo "💡 Etsy stack 有新版本：${current} → ${latest_tag}（运行 \`etsy-stack update\` 升级）"
echo "💡 Etsy stack main 比当前快 ${ahead} 个 commit（${current} → main@${short}，运行 \`etsy-stack update\` 拉取）"
```

Also keep the profile-safe default in both `install.sh` and `scripts/etsy-stack` after upgrades, because upstream may still default to `$HOME/.hermes/skills`:

```bash
HERMES_SKILLS_DIR="${HERMES_SKILLS_DIR:-${HERMES_HOME:-$HOME/.hermes}/skills}"
```

From `v0.1.2+`, `.installed-version` was intentionally removed; verify with `etsy-stack version` / `git describe --tags --always` instead of expecting that file. From `v0.1.7+`, initialize the Etsy workspace marker if missing:

```bash
etsy-stack init "$HOME/workspaces/etsy"
etsy-stack workspace
```

From `v0.3.0`, the manifest includes `image-synth` in addition to the previous five skills.

From the `trend-radar` era, see `references/trend-radar-runtime.md` for local runtime setup details: profile-local checkout discovery, required files, Playwright/system Chrome fallback, Exolyt profile-lock/login_required handling, SerpApi env handling, and weekly Hermes cron requirements. For post-update full-run validation of all four sources and Pinterest preview-limit troubleshooting, see the `trend-radar` skill reference `references/full-run-and-pinterest-troubleshooting.md` if present.

### Promoting dirty runtime edits into GitHub PR

When the local runtime checkout contains useful local edits and the user asks to "整理进仓库 / 走 GitHub PR 流程", do **not** commit from the dirty runtime checkout and do **not** reset it first. Treat the runtime tree as evidence/source only:

1. Capture exact state and backup both tracked and untracked work under the ETSY workspace:

```bash
INSTALL="$HOME/.local/share/etsy-skills"
BACKUP_DIR="$HOME/workspaces/etsy/.hermes/backups/etsy-skills-pr-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
git -C "$INSTALL" status --short --untracked-files=all > "$BACKUP_DIR/status-before.txt"
git -C "$INSTALL" diff --binary > "$BACKUP_DIR/local-modified.patch"
git -C "$INSTALL" diff --cached --binary > "$BACKUP_DIR/local-staged.patch"
git -C "$INSTALL" rev-parse HEAD > "$BACKUP_DIR/head-before.txt"
git -C "$INSTALL" describe --tags --always --dirty > "$BACKUP_DIR/describe-before.txt"
( cd "$INSTALL" && git ls-files --others --exclude-standard -z | tar --null -T - -czf "$BACKUP_DIR/untracked-files.tgz" )
```

2. Create an independent clean clone/worktree from `origin/main` under the ETSY workspace, with a branch named `codex/hermes-<task>`.
3. Apply tracked edits with `git apply --3way "$BACKUP_DIR/local-modified.patch"` and restore untracked files with `tar -xzf "$BACKUP_DIR/untracked-files.tgz" -C "$WORK"`.
4. Inspect diff and stage only task-related paths explicitly; never `git add -A`.
5. Validate skill frontmatter for changed/new `SKILL.md` files (or all repo `SKILL.md` files if cheap), run `git diff --cached --check`, and syntax-check touched shell scripts with `bash -n` where relevant.
6. Commit, push the feature branch, and open a PR. If API/`gh` auth is unavailable after push, provide the GitHub compare URL as the handoff rather than blocking the local promotion work.

This preserves the runtime checkout for later refresh while still moving the useful edits into source control.

### Promoting runtime-local skill edits via GitHub PR

When the ETSY runtime checkout (`$HOME/.local/share/etsy-skills`) is dirty and the user says those local edits should enter `easyaitech/etsy-skills`, do **not** commit or push from the runtime checkout. Treat runtime as evidence only. In the ETSY profile, remember `$HOME` is profile-local (for example `/Users/songchou/.hermes/profiles/etsy-fublessings/home`), so the runtime checkout may be under the profile home rather than `/Users/songchou/.local/share/etsy-skills`; resolve it from live `$HOME`/`HERMES_HOME` before operating.

1. Back up `git status`, `git diff --binary`, staged diff, HEAD, `git describe`, and untracked files under `<workspace>/.hermes/backups/etsy-skills-update-<timestamp>/`.
2. Create a separate clean clone/worktree outside runtime, e.g. `/Users/songchou/workspaces/etsy/repos/etsy-skills-push-latest`.
3. Fetch/verify current `origin/main`; ensure the clean checkout starts at `origin/main` and `git status --short --untracked-files=all` is empty before modifying anything.
4. Create a feature branch from `origin/main`, normally `codex/hermes-<short-task>`.
5. Apply tracked runtime edits with `git apply --3way <backup>/runtime-modified.patch`; note that cleanly applied hunks may be staged by Git, so inspect both `git diff --cached --stat` and `git diff --stat`.
6. Restore untracked files from the backup tarball into the clean checkout, but still stage only task-related paths explicitly. Do not copy the whole runtime tree blindly and do not use `git add -A`.
7. Review `git diff --stat`, `git diff --cached --stat`, `git status --short`, and key file contents before staging/committing.
8. Stage explicit files only, commit with a conventional message, then run checks.
9. For docs/skill-only changes, a useful minimum check is: validate every `SKILL.md` has frontmatter, `name`, `description`, and unique names; run `git diff --cached --check`; run `bash -n install.sh scripts/check-update.sh scripts/etsy-stack`.
10. Push the feature branch only. If HTTPS/`gh` auth is unavailable but SSH over 443 works, set push URL or push with:

```bash
git push -u ssh://git@ssh.github.com:443/easyaitech/etsy-skills.git HEAD
```

11. Verify remote branch SHA equals local HEAD with `git ls-remote origin refs/heads/<branch>` before reporting success.
12. Create the PR with `gh pr create` only if `gh`/`GH_TOKEN` is available. If `gh` token is invalid or PR API auth is unavailable, stop after verified branch push and report the compare URL; do not direct-push or merge main to bypass the PR rule.

### Updating to main with local patches (observed v0.3.0 → main/v0.4.0-era)

When the local checkout is `v0.3.0-dirty` and the user asks to update `etsy-skills`, do not run a blind `etsy-stack update` if local skill edits exist. Use this safe workflow:

```bash
INSTALL="$HOME/.local/share/etsy-skills"
BACKUP_DIR="$HOME/workspaces/etsy/.hermes/backups/etsy-skills-update-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
git -C "$INSTALL" status --short > "$BACKUP_DIR/status-before.txt"
git -C "$INSTALL" diff > "$BACKUP_DIR/local-changes.patch"
git -C "$INSTALL" diff --cached > "$BACKUP_DIR/local-staged-changes.patch"
git -C "$INSTALL" rev-parse HEAD > "$BACKUP_DIR/head-before.txt"
git -C "$INSTALL" describe --tags --always --dirty > "$BACKUP_DIR/describe-before.txt"

git -C "$INSTALL" fetch origin main --tags
git -C "$INSTALL" reset --hard origin/main
git -C "$INSTALL" clean -fd
```

Then reapply mandatory profile/runtime patches if upstream still lacks them:

```bash
# install.sh and scripts/etsy-stack
HERMES_SKILLS_DIR="${HERMES_SKILLS_DIR:-${HERMES_HOME:-$HOME/.hermes}/skills}"

# install.sh final success line
ok "安装完成（版本：${INSTALLED}）"

# scripts/check-update.sh and scripts/etsy-stack: brace variables adjacent to CJK/emoji text
echo "💡 Etsy stack 有新版本：${current} → ${latest_tag}（运行 \`etsy-stack update\` 升级）"
echo "💡 Etsy stack main 比当前快 ${ahead} 个 commit（${current} → main@${short}，运行 \`etsy-stack update\` 拉取）"
echo "✓ 已是最新（当前：${current}）"
```

From the v0.4.0-era stack, `shared/` is a non-skill directory referenced by skill Markdown. Ensure it is linked into the active Hermes skills directory too:

```bash
ln -sfn "$HOME/.local/share/etsy-skills/shared" "$HERMES_HOME/skills/shared"
chmod +x "$HOME/.local/share/etsy-skills/scripts/etsy-stack" "$HOME/.local/share/etsy-skills/scripts/check-update.sh"
ln -sfn "$HOME/.local/share/etsy-skills/scripts/etsy-stack" "$HOME/.local/bin/etsy-stack"
```

Observed main/v0.5.0-era update (`v0.3.0-8-g3c07dcd`): `git fetch origin main --tags` may discover a newer tag such as `v0.5.0`, while `origin/main` still describes as `v0.3.0-8-g...`. This is OK if `etsy-stack check` reports latest. The manifest includes `video-assembly` in addition to the previous skills, and the installer links it automatically when run with `ETSY_SKILLS_REF=main`.

Observed later main update (`v0.3.0-12-ge49b544`): the manifest also includes `supplier-foundation`. Keep it in the post-update symlink and `skill_view` verification list.

Observed `v0.3.0-14-gc35134a`: installer also attempts to sync the external Pinterest-autopin publishing tool and `etsy-stack` has a `pinterest-tool` subcommand. If the tool has local uncommitted changes, the installer leaves skills updated but warns that tool sync failed. Safe workflow: back up/stash the tool diff, then run `etsy-stack pinterest-tool update`. Expected successful status: Pinterest-autopin version `1.4.0`, git `main@55ca5e3`, and `轮播发布：可用（需要 Pinterest 企业账号，工具会走 Ads Manager Pin builder）`. Verify multi-image JSON with `python3 tools/pinterest_publish_pin.py --mode validate --input <json>`; success preserves `payload.images` and reports `ok: true`.

Observed `v0.3.0-15-g402179d`: Pinterest-autopin skill schema was clarified for multi-image Pin Queue Base support. In `pinterest-autopin/references/pin-queue-base-schema.md`, confirm these lines after update: one Pin Queue record equals one Pinterest Pin; carousel uses `images` length 2-5; `image 路径` stores one absolute path per line; `Alt Text (EN)` uses `---` separator; `pin 类型` should be single-select `单图/轮播`; optional `图片数量` and `封面图` fields are recommended; add a `轮播` view. The existing installer still may fail at final output with `INSTALLED�: unbound variable`; if symlinks/tool sync succeeded, apply the profile/runtime brace patches and verify with `etsy-stack check`.

Observed `v0.3.0-16-g507c6b3`: manifest added `trend-radar`. After updating, verify `skill_view('trend-radar')` loads and update the ETSY workspace README to mention the new trend radar capability. If the installer's Pinterest-autopin tool sync fails with GitHub `LibreSSL SSL_connect: SSL_ERROR_SYSCALL`, retry `etsy-stack pinterest-tool update` with proxy variables unset; this succeeded and verified tool version `1.4.0` at `main@55ca5e3`.

Observed `v0.3.0-17-gfec8a22`: upstream removed `trend-radar` from the manifest (`remove trend radar skill #16`). After updating, remove/pause any automated trend-radar cron that would try to run the retired skill, remove the `trend-radar` symlink if it points into the bundle, and update the ETSY workspace README to say China hot-spots weekly reports are Cowork-only reminders rather than Hermes skills. If `install.sh` fails during its initial fetch with `LibreSSL SSL_connect: SSL_ERROR_SYSCALL` after a successful manual `git fetch/reset`, it is acceptable to relink manifest skills manually, then run `etsy-stack version`, `etsy-stack list`, and `etsy-stack check` to verify.

Observed `v0.3.0-29-g30b4119`: trend-radar added the `erank-trend-buzz` source. After update, verify `trend-fetch --help` lists `erank-trend-buzz`, and update the ETSY workspace README to mention Google Trends / Pinterest Trends / eRank Trend Buzz. The installer may run `npm install` under `trend-radar/scripts` and rewrite `trend-radar/scripts/package-lock.json` by removing optional package `libc` metadata on macOS/npm-version differences; if this is the only dirty file and no dependency version actually changed, reset it with `git checkout -- trend-radar/scripts/package-lock.json` so the runtime checkout remains clean.

Observed `v0.3.0-31-ge9481ab`: update added two visible changes after `v0.3.0-29-g30b4119`:

- `feat: add AI publish image sanitizer contract` — installer/CLI exposes `etsy-stack ai-cleaner`; smoke-test with `etsy-stack ai-cleaner` (expected if not installed yet: `AI 发布图清理工具：未安装` plus `etsy-stack ai-cleaner update`). Also verify `image-synth` references `shared/ai-image-sanitization.md` so generated AI images keep raw outputs in `.cache/image-synth/ai_raw/` and only sanitize publish copies during assets-library promote.
- `feat: add order fulfillment SOP` — verify `skill_view('orders-customers')` loads and references `references/order-fulfillment-sop.md`; order updates /待发货 work should use that SOP for phase, next action, missing evidence, and Base writeback preview.

After this update, keep the same macOS/npm package-lock cleanup if `trend-radar/scripts/package-lock.json` is the only dirty file.

After a reset to `origin/main`, run the installer again rather than only relinking manually when network allows, so new manifest entries are installed:

```bash
ETSY_SKILLS_REF=main HERMES_SKILLS_DIR="$HERMES_HOME/skills" ETSY_STACK_BIN="$HOME/.local/bin" \
  bash "$HOME/.local/share/etsy-skills/install.sh"
ln -sfn "$HOME/.local/share/etsy-skills/shared" "$HERMES_HOME/skills/shared"
etsy-stack init "$HOME/workspaces/etsy" || true
```

If `npm install` inside `trend-radar/scripts` or `photo-style/scripts` dirties only package-lock files in the runtime checkout due local npm/platform metadata, reset those lockfiles before verification so the runtime checkout stays clean:

```bash
git -C "$HOME/.local/share/etsy-skills" checkout -- \
  trend-radar/scripts/package-lock.json \
  photo-style/scripts/package-lock.json
git -C "$HOME/.local/share/etsy-skills" status --short
```

### Post-update new-skill collision check

When a new skill is added by `etsy-skills` (for example `content-asset-pool`), verify not only the symlink and `etsy-stack list`, but also whether Hermes can load it by its bare name. Existing profile-local experiments under a category directory can collide with the new upstream skill name and make `skill_view('<name>')` ambiguous:

```text
Ambiguous skill name '<name>': 2 skills match across your local skills dir and external_dirs
```

Use this as a cleanup signal, not as a reason to distrust the new bundle. Inspect both paths, keep the upstream symlinked skill from `$HOME/.local/share/etsy-skills/<name>`, and ask before removing or archiving the older local duplicate (often under `$HERMES_HOME/skills/<category>/<name>`). Do not delete the duplicate silently; it may contain earlier local notes that need to be merged into the upstream skill or a reference file.

Verification after update:

```bash
etsy-stack check
etsy-stack version
etsy-stack list
for s in shop-foundation listing-catalog orders-customers supplier-foundation assets-library content-asset-pool pinterest-autopin image-synth video-assembly trend-radar shared; do
  [ -L "$HERMES_HOME/skills/$s" ] && printf 'OK %s -> %s\n' "$s" "$(readlink "$HERMES_HOME/skills/$s")" || printf 'MISSING %s\n' "$s"
done
# For newly added skills, also verify the loader does not see duplicates:
# skill_view(name='<new-skill>') should load exactly one skill, not report ambiguity.
git -C "$HOME/.local/share/etsy-skills" status --short
```

Note: release tags may not be exactly at `origin/main`; `etsy-stack version` can show a `v0.3.0-N-g<sha>` describe string while `etsy-stack check` says latest. Prefer `etsy-stack check` + `origin/main` HEAD for freshness, and report the exact `git describe` value. A dirty status containing only the mandatory profile/runtime patches is expected after update.

### Bundle may reinstall Pinterest skill

`v0.1.0` manifest includes:

- `shop-foundation`
- `listing-catalog`
- `orders-customers`
- `assets-library`
- `pinterest-autopin`

If the user previously deleted `pinterest-autopin`, installing the bundle will bring it back. Mention this explicitly in the final response.

## Trend Radar local setup note

When updating/configuring the v0.4+ `trend-radar` stack on the cron machine, also consult `references/trend-radar-local-setup-playwright.md`. It captures profile-safe repo/workspace discovery, the system-Chrome workaround for missing Playwright browsers or CDN download failures, Exolyt login-profile initialization, and validation commands.

For local runtime quirks specific to Pinterest trend collection (bilingual table-head parsing, profile-cookie rsync pitfalls, headless Chrome decryption), see `references/trend-radar-local-notes.md`.

For `fit-report` troubleshooting, remember that it reads all matching `outputs/trend-radar/YYYY-MM-DD/*-{geo}.json` files. Raw/debug files such as `google-trends-chinese-US-serpapi.json` can break the report with `趋势源文件缺少必要字段`; move raw files to `.hermes/backups/trend-fit-report-<timestamp>/` before rerunning. For eRank-only reports, the same rule means Google/Pinterest JSON in the same date dir must be moved aside before running `trend-fetch fit-report`; verify `fit-report.json.trend_sources == ["erank-trend-buzz"]`. Missing `BRAND_MARKETING.md`, `MARKETING_PLATFORM.md`, or `.cache/trend-radar/business-context/product-catalog.json` is non-fatal but will keep the report conservative and skip SKU-level matching.

When updating/configuring the v0.4+ `trend-radar` stack on the cron machine, also consult `references/trend-radar-local-setup-playwright.md`. It captures profile-safe repo/workspace discovery, the system-Chrome workaround for missing Playwright browsers or CDN download failures, Exolyt login-profile initialization, and validation commands.

## Verification Checklist

- [ ] Release tag exists via `git ls-remote`.
- [ ] Installer and manifest were inspected before execution.
- [ ] Install was run with `HERMES_SKILLS_DIR="$HERMES_HOME/skills"`.
- [ ] `.installed-version` matches requested tag.
- [ ] Each manifest skill is a symlink under `$HERMES_HOME/skills`.
- [ ] `skill_view` can load each installed skill in the current session or after reset.
- [ ] `etsy-stack version` returns the expected version.
- [ ] `etsy-stack list` reports installed skills, with the profile-safe patch if needed.
- [ ] Final response notes any restored skills, especially `pinterest-autopin`.
