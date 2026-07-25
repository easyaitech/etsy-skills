<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Added principles:
  - I. Semantic Layer Only
  - II. Real Evidence, No Fabrication
  - III. Least Privilege and Explicit Authority
  - IV. Minimal, Backward-Compatible Scope
  - V. Versioned Contracts and Verifiable Releases
- Added sections:
  - Product and Security Constraints
  - Delivery Workflow
- Removed sections: none
- Templates:
  - ✅ .specify/templates/plan-template.md (existing Constitution Check supports these gates)
  - ✅ .specify/templates/spec-template.md (existing requirements and measurable outcomes are sufficient)
  - ✅ .specify/templates/tasks-template.md (existing test-first and story traceability rules are sufficient)
- Follow-up TODOs: none
-->
# ecommerce-skills Constitution

## Core Principles

### I. Semantic Layer Only

Skills MUST own business semantics, routing rules, prompts, quality gates, and response
interpretation. Tool implementations, credentials, queues, browser sessions, and retry state
MUST remain in the approved execution layer. A skill MUST call a stable existing tool or ECS
endpoint instead of reimplementing external-platform access inside this repository.

### II. Real Evidence, No Fabrication

Any statement about a Listing, order, customer, platform state, or tool outcome MUST be backed
by data actually returned in the current execution. Missing values MUST remain missing and
identified as unavailable, unknown, excluded, or failed according to the source contract.
Base records, user recollection, examples, and prior summaries MUST NOT be presented as current
platform truth.

### III. Least Privilege and Explicit Authority

Public data access MUST use a non-authenticated execution path whenever one exists. A
tenant-authenticated browser path MUST be used only for a seller-owned resource after an
explicit user request, and MUST stop on login loss, challenge, rate limiting, or equivalent risk
signals. Tenant IDs and tokens MUST come from the configured runtime binding; public shop names,
Base identifiers, and usernames MUST NOT substitute for authentication material.

### IV. Minimal, Backward-Compatible Scope

Changes MUST touch only the skills and shared contracts required for the approved user outcome.
Existing Base data, legacy read paths, and unrelated platform capabilities MUST be preserved
unless removal is explicitly approved. Read-only work MUST NOT silently introduce writes,
scheduled scans, automated publication, or external side effects. The smallest reusable shared
contract is preferred over a new top-level skill.

### V. Versioned Contracts and Verifiable Releases

Cross-repository tool contracts MUST name their version, inputs, limits, output semantics, and
error boundaries. Documentation MUST be checked against the current canonical implementation,
not another prose summary. A release is complete only when repository checks pass, relative
links resolve, the published tag matches the documented install version, and the upgrade path
can discover that tag.

## Product and Security Constraints

- `shared/` owns cross-skill contracts; individual `SKILL.md` files own only their workflow use.
- `$YANGGEDIANZHANG_TENANT_ID` and the approved backend access contract are the only skill-side
  tenant identity sources.
- Base is an internal catalog and workflow store, not evidence of current external-platform
  state unless the user explicitly asks about the Base record itself.
- External writes require their own approved tool and confirmation flow. A read contract MUST
  never imply that a write occurred.
- Automated inspection, scheduled crawling, or account-bound bulk public scraping requires a
  separate approved scope and MUST NOT be introduced by documentation drift.

## Delivery Workflow

Every feature MUST have a traceable specification, an implementation plan, independently
testable user stories, and explicit acceptance evidence. Contract changes MUST be reviewed
against both the consuming skill and the canonical implementation repository. Tests and static
checks MUST run before release; failures MUST be fixed or recorded as `FAIL`/`UNVERIFIED`, never
rephrased as success. Releases MUST use the repository's existing tag and upgrade workflow, with
the previous stable tag retained as the rollback point.

## Governance

This constitution governs all Spec Kit artifacts and feature changes in this repository.
Amendments require an explicit rationale, a semantic-version bump, propagation review across
Spec Kit templates and runtime guidance, and approval through the normal pull-request process.
Every implementation plan and code review MUST include a Constitution Check. Any exception MUST
be documented with scope, reason, risk, and rollback; undocumented exceptions are invalid.

**Version**: 1.0.0 | **Ratified**: 2026-07-25 | **Last Amended**: 2026-07-25
