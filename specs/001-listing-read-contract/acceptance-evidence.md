# Acceptance Evidence: Etsy Listing Read Contract

## Release identity

- Baseline: `origin/main` at `96ce09b`
- Previous stable release and rollback target: `v1.0.4`
- Planned patch release: `v1.0.5`
- Feature branch: `codex/listing-read-contract`

## Pre-release acceptance

| Gate | Evidence | Status |
|---|---|---|
| JSON manifest | `python3 -m json.tool etsy-stack.json` exited 0 | PASS |
| Shell syntax | `bash -n install.sh scripts/check-update.sh scripts/etsy-stack scripts/lib/env.sh` exited 0 | PASS |
| Python syntax | `python3 -m compileall -q scripts` exited 0 | PASS |
| Active Markdown links | `markdown-links: PASS (322 relative links)` | PASS |
| Listing read contract | `listing-read-contract: PASS` | PASS |
| image-synth regression | `npm test` in `image-synth/scripts`: 20 tests passed | PASS |
| trend-radar regression | `npm test` in `trend-radar/scripts`: 26 tests passed | PASS |
| Diff whitespace | `git diff --check` exited 0 | PASS |
| Backend contract review | Compared with `etsy-listing-read.ts`, the public/admin Hermes prompts, and backend architecture limits | PASS |

The validators first ran in red state: active-document links passed, while the Listing contract
validator failed because the shared contract and `listing-catalog` routing did not yet exist.
After implementation both validators pass.

## Pre-landing review

- Scope check: CLEAN. The diff implements the approved shared contract, consuming skill,
  architecture, validators, release documentation, and Spec Kit acceptance artifacts.
- Plan audit: all repository-verifiable implementation and test items are DONE. Remote release
  state remains PENDING by design until deploy.
- Critical review: no SQL/data, concurrency, LLM trust-boundary, shell-injection, or enum/value
  completeness findings.
- Informational review: no version, prompt, completeness, documentation-staleness, or
  distribution findings.
- Verdict: `Pre-Landing Review: No issues found.`

## QA

- Isolated installer QA: cloned commit `46ba180` into a system temporary directory, installed
  all 15 manifest skills, and verified both `listing-catalog` and `shared` links.
- Installed bundle exposed `shared/etsy-listing-read.md`; the installed consuming skill
  contained Mode D and both production tool routes.
- CLI smoke: `ecommerce-stack version` returned `v1.0.4-23-g46ba180`; `ecommerce-stack list`
  reported all 15 managed skills installed.
- Validator behavior: both repository validators passed; direct negative/path assertions
  confirmed missing-file failure and relative/link parsing behavior.
- Regression: image-synth 20/20 and trend-radar 26/26 tests passed.
- QA verdict: DONE, zero defects found, zero fixes deferred.

## Release procedure

1. Commit the reviewed feature branch and push `codex/listing-read-contract`.
2. Open a PR to `main`; merge only after review, QA, and security gates pass.
3. Confirm the merge commit contains the `v1.0.5` changelog and pinned install examples.
4. Create annotated tag `v1.0.5` on that merge commit and push the tag.
5. Publish a non-draft, non-prerelease GitHub Release for `v1.0.5`.
6. Run the remote tag, release, pinned-install, and update-discovery canaries below.

No tag or release is created during Spec Kit implementation. Those are pipeline deploy actions
after review, QA, and security.

## Rollback procedure

If a release canary fails:

1. Stop recommending `v1.0.5`; do not move or overwrite the immutable tag.
2. Pin installation to the last known-good `v1.0.4`:

   ```bash
   ECOMMERCE_SKILLS_REF=v1.0.4 bash install.sh
   ```

3. Revert the `v1.0.5` merge through a new PR and publish a new patch version after the fix.
4. Preserve the GitHub Release and failure evidence; do not rewrite release history.

## Remote canaries

These checks require the reviewed commit to be merged and released. They are intentionally not
reported as passing before deploy.

| Canary | Success criterion | Pre-release status |
|---|---|---|
| Remote tag | `git ls-remote --tags --refs origin v1.0.5` resolves to the merged release commit | PENDING |
| GitHub Release | `gh release view v1.0.5` reports published, not draft, not prerelease | PENDING |
| Pinned installer | `https://raw.githubusercontent.com/easyaitech/etsy-skills/v1.0.5/install.sh` returns the released installer | PENDING |
| Update discovery | A `v1.0.4` install reports `v1.0.5` through the existing update check | PENDING |

Final acceptance remains pending until all four remote canaries pass.
