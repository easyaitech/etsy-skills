# Implementation Plan: Etsy Listing Read Contract

**Branch**: `codex/listing-read-contract` | **Date**: 2026-07-25 |
**Spec**: [spec.md](spec.md)

**Input**: Adopted plan in `docs/etsy-listing-read-skill-contract-plan.md`

## Summary

Add one shared, versioned interpretation and routing contract for the two production Etsy
Listing read paths, then make `listing-catalog` consume it when reading or optimizing existing
Listings. Preserve Base, inspection, and all write workflows. Release the documentation-only
change as `v1.0.5`, the next patch after the latest published `v1.0.4`.

## Technical Context

**Language/Version**: Markdown contracts; Bash/Python 3 for existing validation and install tools

**Primary Dependencies**: Existing `shared/backend-api-access.md`, canonical
`yanggedianzhang` Listing read contract, Git/GitHub release workflow

**Storage**: Repository Markdown only; no runtime or customer data storage

**Testing**: Markdown relative-link validation, contract grep assertions, JSON validation,
existing stack CLI/doctor smoke tests, remote tag/update canary

**Target Platform**: Hermes Agent installations managed by `ecommerce-stack`

**Project Type**: Versioned skill bundle and shared semantic contracts

**Performance Goals**: No new runtime process, scheduled work, browser access, or network call at
skill activation time

**Constraints**: Read-only capability; preserve Base and legacy comparison; public bulk never
uses seller browser; admin reads require explicit operator intent; no credentials in repository

**Scale/Scope**: One shared contract, one consuming skill, architecture/README/changelog/release
documentation, Spec Kit artifacts

## Constitution Check

*GATE: Passed before Phase 0 and re-checked after Phase 1.*

- **Semantic Layer Only — PASS**: Change documents stable existing ECS endpoints; no tool
  implementation enters this repository.
- **Real Evidence — PASS**: Contract makes current tool output the only live Listing evidence and
  forbids Base/recollection fallback.
- **Least Privilege — PASS**: Public and seller-admin routes are separate; authenticated access
  requires explicit intent and risk-stop behavior.
- **Minimal Scope — PASS**: No new top-level skill, write tool, scheduler, Base mutation, or
  backend change.
- **Versioned Release — PASS**: Contract pins `etsy-listing-read/v1`; release checks cover links,
  latest tag, README install URL, and upgrade discovery.

Post-design re-check: PASS. The contract and quickstart preserve all five gates with no
complexity exception.

## Project Structure

### Documentation (this feature)

```text
specs/001-listing-read-contract/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
├── contracts/
│   └── listing-read-skill-contract.md
└── tasks.md
```

### Repository files

```text
shared/
├── backend-api-access.md
├── etsy-listing-read.md
└── tools-architecture.md
listing-catalog/
└── SKILL.md
README.md
CHANGELOG.md
install.sh
```

**Structure Decision**: The reusable tool contract belongs in `shared/`; `listing-catalog`
contains only workflow routing and consumption rules. Existing backend access remains canonical
for authentication and HTTP mechanics.

## Complexity Tracking

No constitution violations or additional components are required.
