# Tasks: Etsy Listing Read Contract

**Input**: Design documents from `specs/001-listing-read-contract/`

**Tests**: Static contract and link validators are required because this repository's runtime
surface is Markdown consumed by an Agent.

## Phase 1: Setup

**Purpose**: Fix the implementation and release baseline.

- [X] T001 Record current `origin/main`, latest published tag `v1.0.4`, and target patch
  `v1.0.5` in `specs/001-listing-read-contract/research.md`
- [X] T002 Confirm the canonical backend contract paths and current production limits in
  `specs/001-listing-read-contract/contracts/listing-read-skill-contract.md`

---

## Phase 2: Foundational Validation

**Purpose**: Add executable checks before changing the skill contract.

- [X] T003 [P] Add repository-relative Markdown link validation in
  `scripts/validate-markdown-links.py`
- [X] T004 [P] Add Listing routing, safety, Base-separation, and version assertions in
  `scripts/validate-listing-read-contract.py`
- [X] T005 Run both validators before implementation and record the expected Listing-contract
  failure in `specs/001-listing-read-contract/quickstart.md`

**Checkpoint**: Validation exists and fails on the missing shared contract.

---

## Phase 3: User Story 1 - Read the Real Listing Source (Priority: P1) 🎯 MVP

**Goal**: Route public and seller-admin Listing reads to the correct production source.

**Independent Test**: The contract validator proves all six source/mode routes, limits, tenant
identity source, and risk-stop rules are documented without Base/plugin misuse.

- [X] T006 [US1] Create the canonical public/admin read contract in
  `shared/etsy-listing-read.md`
- [X] T007 [US1] Register both production execution paths and paused-inspection boundary in
  `shared/tools-architecture.md`
- [X] T008 [US1] Run `scripts/validate-listing-read-contract.py` and resolve all US1 routing and
  safety failures

**Checkpoint**: Public and admin reads are independently routable and documented.

---

## Phase 4: User Story 2 - Optimize from Live Evidence (Priority: P2)

**Goal**: Make existing-Listing analysis use live data while keeping Base as internal context.

**Independent Test**: Static assertions prove that `listing-catalog` reads the appropriate live
source before optimization, labels Base separately, and makes no write claim.

- [X] T009 [US2] Extend `listing-catalog/SKILL.md` triggers and mode B/C routing for reading,
  analyzing, and optimizing existing Etsy Listings
- [X] T010 [US2] Update the user-facing capability summary in `README.md` without adding a new
  top-level skill
- [X] T011 [US2] Run `scripts/validate-listing-read-contract.py` and resolve all optimization,
  Base-boundary, and read-only failures

**Checkpoint**: Existing Listing optimization has a real, source-aware baseline.

---

## Phase 5: User Story 3 - Reuse Complete, Versioned Results (Priority: P3)

**Goal**: Give future workflows one consistent interpretation of partial and unknown data.

**Independent Test**: Contract checks prove `etsy-listing-read/v1`, evidence, unknown/raw,
unavailable, excluded, errors, completeness, and no-fabricated-empty behavior are all defined.

- [X] T012 [US3] Complete downstream result interpretation and reusable consumer rules in
  `shared/etsy-listing-read.md`
- [X] T013 [US3] Reference the unchanged canonical access rules from
  `shared/etsy-listing-read.md`
- [X] T014 [US3] Run both validators and resolve all versioning, completeness, and link failures

**Checkpoint**: All current and future consumers share one result meaning.

---

## Phase 6: Release and Acceptance

**Purpose**: Publish a verifiable patch release through the existing upgrade path.

- [X] T015 Update `CHANGELOG.md`, all pinned install examples in `README.md` and `install.sh`,
  and rollback documentation for `v1.0.5`
- [X] T016 Run JSON, Bash syntax, Python compile, Markdown link, Listing contract, Spec Kit task,
  and `git diff --check` gates from `specs/001-listing-read-contract/quickstart.md`
- [X] T017 Review the complete diff against the canonical backend contract and fix all blocking
  findings
- [X] T018 Prepare the PR, `v1.0.5` Git tag/GitHub Release, and `v1.0.4` rollback procedure in
  `specs/001-listing-read-contract/acceptance-evidence.md`
- [X] T019 Record pre-release evidence and explicit pending remote tag/release/install/update
  canaries in `specs/001-listing-read-contract/acceptance-evidence.md`

---

## Dependencies & Execution Order

- Phase 1 fixes the canonical implementation and release baseline.
- Phase 2 supplies tests and must fail before the missing contract is implemented.
- US1 is the MVP and blocks US2/US3 because they consume the routing contract.
- US2 and US3 edit separate areas after US1 and may proceed independently.
- Release starts only after all three stories and validators pass.

## Parallel Opportunities

- T003 and T004 touch separate validator files.
- After US1, T009/T010 and T012/T013 cover separate workflow and result-semantics sections.
- Documentation link validation and contract assertions can run in parallel during final gates.

## Implementation Strategy

1. Establish failing contract tests.
2. Deliver US1 routing as the smallest useful increment.
3. Add US2 optimization consumption and US3 result semantics.
4. Run all repository gates and perform current-diff review.
5. Merge, tag `v1.0.5`, and validate update discovery from `v1.0.4`.
