# Feature Specification: Etsy Listing Read Contract

**Feature Branch**: `codex/listing-read-contract`

**Created**: 2026-07-25

**Status**: Approved

**Input**: Adopt the completed plan in `docs/etsy-listing-read-skill-contract-plan.md`
without reopening product scope.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the Real Listing Source (Priority: P1)

As a shop operator using the Agent, I want requests to read an Etsy Listing routed to the
appropriate live source so that the returned information reflects the public page or my seller
admin rather than a stale internal catalog.

**Why this priority**: Every later optimization, comparison, or reuse workflow is unsafe if the
initial Listing facts come from the wrong source.

**Independent Test**: Ask for one public Listing URL, one public batch, one public shop, one owned
Listing, and one owned shop. In each case, verify that the skill selects the correct read path,
states its source, and does not substitute Base data.

**Acceptance Scenarios**:

1. **Given** a public Etsy Listing URL or public shop URL, **When** the operator asks to read it,
   **Then** the Agent uses the public read path without the seller browser or Base.
2. **Given** an owned Listing ID or a request to inspect the operator's Etsy admin,
   **When** the operator explicitly requests the read, **Then** the Agent uses the authorized
   admin read path and stops on login, challenge, or rate-limit signals.
3. **Given** no successful live read result, **When** the Agent responds,
   **Then** it reports the failure or unavailable fields and does not present Base or recalled
   values as current Etsy facts.

---

### User Story 2 - Optimize from Live Evidence (Priority: P2)

As a shop operator, I want an existing Listing optimization to begin with its current live
content so that recommendations are based on what buyers or the seller editor actually contains.

**Why this priority**: Optimization advice is useful only when its baseline is current and
traceable.

**Independent Test**: Ask to optimize an owned Listing and a public competitor Listing. Verify
that the Agent first reads the relevant live source, distinguishes source facts from suggestions,
and makes no write claim.

**Acceptance Scenarios**:

1. **Given** a successful live read, **When** the operator asks for optimization,
   **Then** the Agent identifies the captured fields and bases recommendations only on those
   fields plus clearly identified internal context.
2. **Given** Base has a different title or description, **When** the live Listing is read,
   **Then** the live source remains the current-platform baseline and the Base difference is
   treated only as internal catalog context.
3. **Given** the tools are read-only, **When** recommendations are delivered,
   **Then** the Agent does not state or imply that Etsy or Base was modified.

---

### User Story 3 - Reuse Complete, Versioned Results (Priority: P3)

As a future workflow author, I want one shared interpretation contract for Listing reads so that
listing optimization, cross-platform composition, and future batch-change planning interpret
partial and unknown fields consistently.

**Why this priority**: A shared contract prevents each downstream skill from inventing different
meanings for missing or unmapped data.

**Independent Test**: Review each consuming workflow against the shared contract and verify that
every documented result category has one consistent meaning and that no new top-level skill or
write capability was introduced.

**Acceptance Scenarios**:

1. **Given** a versioned read result, **When** a downstream workflow consumes it,
   **Then** mapped, unknown, unavailable, excluded, and error fields retain their documented
   meanings.
2. **Given** a source field that cannot be interpreted, **When** the workflow reports it,
   **Then** it remains visible with its reason rather than being silently dropped or replaced
   with a fabricated empty value.

### Edge Cases

- A shop name is supplied where the configured canonical tenant identity is required.
- Public reading times out, returns a pending transport state, or returns no Listing record.
- Seller login expires, Etsy presents a challenge, or the plugin encounters rate limiting.
- A result is complete at the transport level but contains unknown or unavailable fields.
- The request supplies conflicting duplicate limits or exceeds the documented single-call cap.
- A Listing URL is wrapped in Markdown or uses a supported Etsy locale/shop URL form.
- Base contains a record for the Listing but the live source cannot be read.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The stack MUST provide one shared contract that distinguishes public Listing reads
  from seller-admin Listing reads.
- **FR-002**: Public Listing URLs, public batches, and public shop enumeration MUST route to a
  path that does not use the seller's authenticated browser or Base.
- **FR-003**: Seller-admin reads MUST require an explicit operator request and MUST stop on login
  loss, challenge, rate limiting, quota, or plugin failure.
- **FR-004**: The contract MUST describe single, batch, and shop modes and their current
  per-call limits.
- **FR-005**: The contract MUST describe the versioned result and distinguish mapped data,
  evidence, unknown/raw, unavailable, excluded, and errors.
- **FR-006**: The stack MUST forbid fabricated empty values and silent omission of obtained
  source fields.
- **FR-007**: The configured canonical tenant identity MUST be used; a shop name or other public
  identifier MUST NOT be used as a substitute.
- **FR-008**: `listing-catalog` MUST treat live Etsy data as the current platform baseline and
  Base as internal catalog/history context.
- **FR-009**: Existing Listing optimization MUST attempt the appropriate live read before
  generating current-state recommendations.
- **FR-010**: A failed live read MUST remain an explicit failure or partial result; the Agent
  MUST NOT fall back to Base or recollection while describing the result as current Etsy data.
- **FR-011**: The update MUST remain read-only and MUST NOT add scheduled inspection, automatic
  Etsy writes, automatic Base writes, or automatic publishing.
- **FR-012**: Existing Base comparison code, data, and manually triggered workflows MUST remain
  available and unchanged.
- **FR-013**: The shared backend access contract MUST remain the sole source for tenant identity,
  authentication handling, and public-gate error interpretation.
- **FR-014**: The release documentation MUST identify the new patch version, prior stable
  rollback version, and upgrade path.

### Key Entities

- **Listing Read Source**: The public page or authenticated seller editor from which current
  Listing facts were captured.
- **Versioned Listing Result**: A read outcome containing source identity, captured data,
  evidence, explicit non-mapped categories, errors, and completeness.
- **Internal Catalog Context**: Base data used for internal planning, drafts, and history, but not
  proof of current Etsy state.
- **Read Routing Decision**: The choice between public and seller-admin access based on the
  operator's request, resource ownership, and required authentication.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All six documented read scenarios—public single, public batch, public shop, admin
  single, admin batch, and admin shop—have an unambiguous route and independently testable
  expected behavior.
- **SC-002**: Every result category exposed by the current versioned Listing output has exactly
  one documented interpretation, with zero undocumented silent-fallback paths.
- **SC-003**: In all acceptance scenarios, a failed live read produces an explicit failure or
  partial response and never a current-state claim based only on Base data.
- **SC-004**: The change introduces zero scheduled Listing traffic, zero Etsy write behavior,
  zero automatic Base writes, and zero new top-level skills.
- **SC-005**: All repository validation checks and Markdown link checks pass with zero broken
  references.
- **SC-006**: The published patch release is discoverable through the existing upgrade workflow,
  and its documented installation version matches the published tag.

## Assumptions

- The two Listing read tools and their versioned output are already implemented and production
  validated in the canonical backend repository.
- Hermes supplies the canonical tenant identity and tool credential through the existing runtime
  binding; users are not asked to type or invent either value.
- A downstream write or batch-modification capability will be specified separately if requested.
- Existing Base comparison/history behavior remains useful but is not automatically invoked by
  the new read routing.
