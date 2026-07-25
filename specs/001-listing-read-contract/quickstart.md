# Quickstart: Validate Etsy Listing Read Skill Contract

## Prerequisites

- Repository checkout on the feature branch.
- Bash, Python 3, Git, and ripgrep.
- No Etsy login, browser plugin, Base access, backend token, or Apify credential is required for
  repository validation.

## 1. Validate JSON and Markdown links

```bash
python3 -m json.tool etsy-stack.json >/dev/null
python3 scripts/validate-markdown-links.py
```

Expected: both commands exit zero and the link validator reports no broken relative links.
Historical changelog entries are excluded because their referenced retired files are not part of
the installed runtime documentation.

Initial red-phase result on 2026-07-25:

- Markdown active-document validation: PASS after excluding historical changelog entries.
- Listing contract validation: expected FAIL because `shared/etsy-listing-read.md` and the
  `listing-catalog` routing language did not yet exist.

## 2. Validate routing and safety assertions

```bash
python3 scripts/validate-listing-read-contract.py
```

Expected: the validator confirms the public/admin route matrix, canonical tenant source,
versioned result categories, read-only boundary, Base separation, and paused-inspection rule.

## 3. Validate the stack package

```bash
bash -n install.sh scripts/check-update.sh scripts/etsy-stack scripts/lib/env.sh
python3 -m compileall -q scripts
```

Expected: all commands exit zero.

## 4. Validate release metadata before tagging

```bash
rg -n 'v1\\.0\\.5' README.md install.sh CHANGELOG.md
test "$(rg -c '^- \[X\] T[0-9]{3}' specs/001-listing-read-contract/tasks.md)" -eq 19
git describe --tags --always
```

Expected: current install examples and changelog name `v1.0.5`, all 19 Spec Kit tasks are
complete, and the previous stable tag remains `v1.0.4` until the new release is published.

## 5. Post-release canary

```bash
git ls-remote --tags --refs origin 'v1.0.5'
gh release view v1.0.5 --repo easyaitech/etsy-skills
```

Expected: the tag resolves to the merged release commit, the GitHub release is published and not
a prerelease, and a `v1.0.4` installation reports `v1.0.5` through the existing update check.
