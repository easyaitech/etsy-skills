# Research: Etsy Listing Read Contract

## Decision 1: Shared contract, not a new top-level skill

**Decision**: Add `shared/etsy-listing-read.md` and reference it from `listing-catalog`.

**Rationale**: Listing reading is a reusable tool primitive. A top-level skill would duplicate
routing and authentication rules and incorrectly imply a separate business workflow.

**Alternatives considered**:

- Put all details in `listing-catalog/SKILL.md`: rejected because future optimization,
  cross-platform composition, and batch-change planning would duplicate the contract.
- Add `listing-reader` to `etsy-stack.json`: rejected because it expands routing surface without
  a distinct user outcome.

## Decision 2: Backend implementation remains canonical

**Decision**: Translate the current `yanggedianzhang` production prompts, architecture contract,
and `etsy-listing-read/v1` domain semantics; reference `shared/backend-api-access.md` for common
identity/auth/error handling.

**Rationale**: The backend contains the live route handlers, limits, result validation, and
browser capability requirements. Copying authentication logic into the skill bundle would drift.

**Alternatives considered**:

- Treat previous bot outputs as the source of truth: rejected because they are evidence samples,
  not the executable contract.
- Copy bearer-token derivation into the new reference: rejected because skills must use injected
  values and must not own authentication.

## Decision 3: Route by source authority

**Decision**:

- Public URL, competitor, or public batch/shop → public read.
- Seller-owned editor/configuration after explicit request → admin read.
- Base → internal catalog/history only, never current Etsy truth.

**Rationale**: Public and admin pages expose materially different fields. Keeping the routes
separate minimizes account risk and preserves provenance.

**Alternatives considered**:

- Always use the authenticated plugin for higher field coverage: rejected because public batches
  can create unnecessary seller-account traffic and account risk.
- Always use public data: rejected because seller editor fields are not exposed publicly.
- Compare with Base by default: rejected because inspection is paused and Base is not required
  for either read tool.

## Decision 4: Document transport without leaking internal progress

**Decision**: Public reads use start/poll internally and return only the final versioned result;
admin reads return directly after the authorized extension completes.

**Rationale**: This matches the production Cloudflare-safe transport while preserving the user's
experience of one logical tool call.

**Alternatives considered**:

- Expose request IDs and pending responses: rejected because they are transport details and can
  cause users or agents to treat a pending state as the final result.
- Recreate polling in a new local script: rejected because the existing Hermes prompt and ECS
  endpoints already define it.

## Decision 5: Patch release `v1.0.5`

**Decision**: Release the merged contract as `v1.0.5` and update all current install examples.

**Rationale**: The latest published release is `v1.0.4`; this is backward-compatible
documentation/behavior routing. README currently points to `v1.0.1`, so the release must close
that observable version drift.

**Alternatives considered**:

- Reuse `v1.0.4`: rejected because tags are immutable release evidence.
- Publish a minor version: rejected because no skill is removed and existing workflows remain
  compatible.
- Leave README at `v1.0.1`: rejected because the documented pinned install would omit this
  feature.
