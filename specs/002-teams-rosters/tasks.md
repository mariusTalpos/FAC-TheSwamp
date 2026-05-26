---
description: "Implementation tasks for Teams & Rosters (Epic E2)"
---

# Tasks: Teams & Rosters (Epic E2)

**Input**: Design documents from `/specs/002-teams-rosters/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml), [research.md](./research.md), [quickstart.md](./quickstart.md). **E1 complete** on branch `001-foundation-identity-roles` (users, fighter profiles, operational RBAC, audit baseline).

**Tests**: Automated verification is **expected** per [spec.md](./spec.md) Verification expectations and SC-001–SC-005. Vitest and Playwright tasks are in **Phase 8 (Polish)**; story phases focus on deliverable APIs/UI with manual checkpoints per [quickstart.md](./quickstart.md).

**Organization**: Phases follow user story priority (P1–P3) after E2 setup and foundational schema/domain work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no dependency on incomplete tasks in the same batch)
- **[USn]**: User story label from [spec.md](./spec.md)
- Paths follow [plan.md](./plan.md) (`apps/web/` Next.js app)

---

## Phase 1: Setup (E2 Shared Infrastructure)

**Purpose**: E2 module layout, API contracts, and environment flags on top of the existing E1 app.

- [X] T001 Add `PUBLIC_TEAM_ROSTER` (default `false`) to `apps/web/.env.example` and document in `specs/002-teams-rosters/quickstart.md` per research.md §9
- [X] T002 Create `apps/web/src/lib/teams/` module skeleton (`permissions.ts`, `membership-service.ts`, `affiliation-summary.ts`, `audit.ts`, `contracts.ts`) per plan.md Project Structure
- [X] T003 [P] Add Zod request/response schemas in `apps/web/src/lib/teams/contracts.ts` mirroring `TeamCreateRequest`, `TeamUpdateRequest`, `TeamApplyRequest`, `MembershipDecisionRequest`, and response DTOs from `specs/002-teams-rosters/contracts/openapi.yaml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database tables, migrations, team permission layer, membership state machine, affiliation projection, audit vocabulary, and last-captain guard. **No user-story routes or UI** until this phase completes.

**⚠️ CRITICAL**: User story phases MUST NOT start until this checkpoint passes.

- [X] T004 Add Drizzle enums and tables `team`, `team_captain_assignment`, `team_membership` in `apps/web/src/lib/db/schema.ts` per `specs/002-teams-rosters/data-model.md` (status enums, optional `contact_email`/`contact_phone` on `team`, partial unique indexes for active/pending membership and active captain)
- [X] T005 Generate and commit E2 migration SQL under `apps/web/drizzle/migrations/` from T004 schema (`pnpm db:generate` / `pnpm db:migrate` workflow)
- [X] T006 [P] Add team audit `event_type` constants and `writeTeamAuditEvent` helper in `apps/web/src/lib/teams/audit.ts` wrapping `apps/web/src/lib/audit/write-audit-event.ts` with payloads including `team_id`, `membership_id`, `member_kind`, and status transitions per research.md §8
- [X] T007 [P] Implement team-scoped permission helpers in `apps/web/src/lib/teams/permissions.ts` (`requireFacAdmin`, `requireCaptainOfTeam`, `requireCaptainOrFacAdminForTeamRoster`, `requireActiveMemberOfTeam` for member roster read, `canDecideMembership`, cross-team denial) evaluated **alongside** E1 `apps/web/src/lib/rbac/` session roles per research.md §1
- [X] T008 Implement membership state machine in `apps/web/src/lib/teams/membership-service.ts` (`apply`, `approve`, `reject`, `end`, dual-affiliation guard, **deactivated-team apply block** (`team.status = deactivated` → 400), self-approval → FAC-admin routing, disabled-user block, **re-apply after `rejected`**: insert **new** `pending` row with **new** `team_membership.id`; never mutate or reuse rejected/ended row ids per FR-012 and spec Edge Cases) per data-model.md §3 and research.md §§5–6
- [X] T009 [P] Implement affiliation projection in `apps/web/src/lib/teams/affiliation-summary.ts` (`unaffiliated` / `pending` / `active` per `member_kind`) for `UserAffiliationSummary` per data-model.md §4 and FR-014
- [X] T010 Implement last-captain guard in `apps/web/src/lib/teams/last-captain-guard.ts` mirroring `apps/web/src/lib/rbac/last-fac-admin-guard.ts` pattern for captain revoke (409 when last active captain) per data-model.md §2

**Checkpoint**: Migrations apply; `membership-service` unit-testable; permission helpers callable from route handlers.

---

## Phase 3: User Story 1 — Team records and captain assignment (Priority: P1) 🎯 MVP

**Goal**: FAC administrators create/update/deactivate teams and assign/revoke team captains with audit and last-captain protection (FR-001, FR-007, FR-010, FR-013).

**Independent Test**: As FAC admin, create a team, assign a captain user, and verify the captain can see team management entry points while a non-captain fighter cannot.

### Implementation for User Story 1

- [X] T011 [US1] Implement POST `apps/web/src/app/api/admin/teams/route.ts` mapping openapi `POST /admin/teams` (create team including optional contact fields, audit `team.created`, Zod + `requireFacAdmin`)
- [X] T012 [US1] Implement GET `apps/web/src/app/api/admin/teams/route.ts` mapping openapi `GET /admin/teams` (FAC admin list)
- [X] T013 [US1] Implement PATCH `apps/web/src/app/api/admin/teams/[teamId]/route.ts` mapping openapi `PATCH /admin/teams/{teamId}` (metadata, contact fields, `status` deactivate, audit `team.updated` / `team.deactivated`)
- [X] T014 [US1] Implement POST `apps/web/src/app/api/admin/teams/[teamId]/captains/route.ts` mapping openapi `POST /admin/teams/{teamId}/captains` (assign captain, audit `team_captain.assigned`)
- [X] T015 [US1] Implement DELETE `apps/web/src/app/api/admin/teams/[teamId]/captains/[userId]/route.ts` mapping openapi `DELETE /admin/teams/{teamId}/captains/{userId}` with `last-captain-guard` (409), audit `team_captain.revoked`
- [X] T016 [US1] Implement POST `apps/web/src/app/api/admin/teams/[teamId]/memberships/[membershipId]/decide/route.ts` mapping openapi admin decide (approve/reject override for captain self-application and FR-007 overrides)
- [X] T016a [US1] Implement GET `apps/web/src/app/api/admin/teams/[teamId]/roster/route.ts` mapping openapi `GET /admin/teams/{teamId}/roster` (`requireFacAdmin`, FR-005 active roster for FAC admin)
- [X] T017 [P] [US1] Build FAC admin team list/create UI in `apps/web/src/app/(auth)/admin/teams/page.tsx` with accessible form labels, optional contact fields, and deactivate confirmation per spec.md Accessibility expectations
- [X] T018 [P] [US1] Build team detail UI in `apps/web/src/app/(auth)/admin/teams/[teamId]/page.tsx` for metadata edit (including contact fields), captain assign/revoke, **active roster panel** (T016a), and link to membership override queue
- [X] T019 [US1] Add captain navigation entry in `apps/web/src/app/(auth)/captain/teams/[teamId]/layout.tsx` (or shared nav component) visible only when `permissions.isCaptainOfTeam` for session user
- [X] T020 [US1] Wire audit + 403 denial paths for non-admin team mutations (write `membership.action_denied` / equivalent when applicable per FR-010)

- [X] T018a [US1] Accessibility checkpoint: keyboard path and accessible names on admin team list, create form, deactivate confirmation, and team detail (record in `apps/web/docs/accessibility-verification-e2.md` §US1)

**Checkpoint**: FAC admin can manage teams and captains; assigned captain sees captain surfaces; non-captain denied on captain routes; FAC admin sees active roster on team detail (FR-005).

---

## Phase 4: User Story 2 — Fighter applies; captain approves (Priority: P1)

**Goal**: Fighters apply to teams, captains approve/reject, affiliation summary shows **unaffiliated** until active membership; **active members** can view other **approved** teammates on the roster (FR-003, FR-004, FR-005, FR-009, FR-014).

**Independent Test**: Fighter with no active membership applies → captain approves → fighter on active roster; rejection leaves fighter off roster; unaffiliated status visible on `/me`.

### Implementation for User Story 2

- [X] T021 [US2] Implement GET `apps/web/src/app/api/teams/route.ts` mapping openapi `GET /teams` (active teams for application, authenticated)
- [X] T022 [US2] Implement POST `apps/web/src/app/api/me/team-memberships/apply/route.ts` mapping openapi `POST /me/team-memberships/apply` via `membership-service.apply` (`member_kind: fighter`, dual-affiliation 400, duplicate pending 409)
- [X] T023 [US2] Implement GET `apps/web/src/app/api/me/team-affiliation/route.ts` mapping openapi `GET /me/team-affiliation` using `affiliation-summary.ts`
- [X] T024 [US2] Implement GET `apps/web/src/app/api/captain/teams/[teamId]/pending/route.ts` mapping openapi `GET /captain/teams/{teamId}/pending` (captain-only, wrong-team 403 + audit)
- [X] T025 [US2] Implement POST `apps/web/src/app/api/captain/teams/[teamId]/memberships/[membershipId]/decide/route.ts` mapping openapi captain decide (block self-approval 409 → FAC admin path per research.md §5)
- [X] T026 [US2] Implement GET `apps/web/src/app/api/captain/teams/[teamId]/roster/route.ts` mapping openapi `GET /captain/teams/{teamId}/roster` (active members with `member_kind`; allow **captain or FAC admin** via `requireCaptainOrFacAdminForTeamRoster`)
- [X] T026b [US2] Implement GET `apps/web/src/app/api/me/teams/[teamId]/roster/route.ts` mapping openapi `GET /me/teams/{teamId}/roster` (`requireActiveMemberOfTeam`, `status = active` only, same `TeamRosterResponse` projection as T026; FR-005 member read)
- [X] T027 [P] [US2] Build fighter affiliation UI in `apps/web/src/app/(auth)/me/team-affiliation/page.tsx` (unaffiliated copy, apply-to-team flow, pending state, **active team roster panel** listing other approved members via T026b when user has active membership) per FR-005, FR-014, and Accessibility expectations
- [X] T028 [P] [US2] Build captain pending queue UI in `apps/web/src/app/(auth)/captain/teams/[teamId]/pending/page.tsx` with approve/reject confirmations and optional note field
- [X] T029 [US2] Build captain active roster UI in `apps/web/src/app/(auth)/captain/teams/[teamId]/roster/page.tsx` listing active members
- [X] T030 [US2] Update `apps/web/src/app/(auth)/me/page.tsx` to surface fighter **unaffiliated** / roster-ready messaging linking to team affiliation (FR-014 product copy)
- [X] T030a [US2] Create `apps/web/docs/accessibility-verification-e2.md` baseline covering fighter apply, **member team roster panel** (approved peers), captain pending queue (approve/reject confirmations), captain roster list, and `/me` affiliation (WCAG 2.1 AA checkpoint per spec.md; extend in later story tasks)
- [X] T030b [US2] Accessibility checkpoint: verify keyboard-operable apply flow, pending queue, and roster list; confirm destructive actions do not rely on color alone (document in T030a artifact)

**Checkpoint**: End-to-end fighter apply → captain approve → roster appearance matches SC-004 manual path steps 2–5; E2 a11y baseline doc exists for MVP surfaces.

---

## Phase 5: User Story 3 — Squire team affiliation (Priority: P2)

**Goal**: Squire operational-role users apply and are approved as `member_kind: squire` without conflating fighter memberships (FR-002, FR-004).

**Independent Test**: User with squire role applies as squire, captain approves, active squire membership visible on roster distinct from fighter applications.

### Implementation for User Story 3

- [X] T031 [US3] Extend `apps/web/src/lib/teams/membership-service.ts` apply path to require E1 `squire` operational role when `memberKind === 'squire'` and return clear 403 otherwise
- [X] T032 [US3] Extend `apps/web/src/lib/teams/affiliation-summary.ts` and `GET /me/team-affiliation` response to expose separate `squire` slot per openapi `UserAffiliationSummary`
- [X] T033 [US3] Update captain pending UI in `apps/web/src/app/(auth)/captain/teams/[teamId]/pending/page.tsx` to display and filter by `member_kind` (fighter vs squire)
- [X] T034 [US3] Update captain roster UI in `apps/web/src/app/(auth)/captain/teams/[teamId]/roster/page.tsx` to show `member_kind` column/badge per acceptance scenario 3
- [X] T035 [US3] Update fighter affiliation UI in `apps/web/src/app/(auth)/me/team-affiliation/page.tsx` to allow squire apply when user holds squire operational role (shared apply API, distinct copy)

**Checkpoint**: Squire apply/approve path works independently of fighter path; hybrid fighter+squire users see both affiliation slots when applicable.

---

## Phase 6: User Story 4 — Roster maintenance and historical affiliation (Priority: P2)

**Goal**: Captains and FAC admins end active memberships; historical intervals remain queryable (FR-006, FR-007, SC-003).

**Independent Test**: Captain removes active member → absent from active roster; FAC admin ends membership via admin **end** route (same semantics as captain); FAC admin retrieves ended interval with timestamps without DB access.

### Implementation for User Story 4

- [X] T036 [US4] Implement POST `apps/web/src/app/api/captain/teams/[teamId]/memberships/[membershipId]/end/route.ts` mapping openapi `POST /captain/teams/{teamId}/memberships/{membershipId}/end` via `membership-service.end` (`requireCaptainOfTeam`, sets `ended_at`, audit `membership.ended`)
- [X] T037 [US4] Implement POST `apps/web/src/app/api/admin/teams/[teamId]/memberships/[membershipId]/end/route.ts` mapping openapi `POST /admin/teams/{teamId}/memberships/{membershipId}/end` via `membership-service.end` (`requireFacAdmin`, audit `membership.ended` + `membership.admin_override` per FR-007)
- [X] T037a [US4] Ensure admin decide route in `apps/web/src/app/api/admin/teams/[teamId]/memberships/[membershipId]/decide/route.ts` handles **pending only** (approve/reject overrides: captain self-application, FR-007 decision overrides); audit `membership.admin_override` on approve/reject; **do not** use decide for active roster removal (use T037)
- [X] T038 [US4] Implement GET `apps/web/src/app/api/captain/teams/[teamId]/memberships/history/route.ts` mapping openapi `GET /captain/teams/{teamId}/memberships/history` (captain-scoped read per spec acceptance scenario 3)
- [X] T039 [US4] Implement GET `apps/web/src/app/api/admin/teams/[teamId]/memberships/history/route.ts` mapping openapi `GET /admin/teams/{teamId}/memberships/history` for FAC-global affiliation history on a team
- [X] T040 [US4] Add roster removal control to `apps/web/src/app/(auth)/captain/teams/[teamId]/roster/page.tsx` with destructive confirmation (not color-only) per Accessibility expectations
- [X] T041 [US4] Add membership history panel and **FAC admin roster removal** (calls T037 admin end API) to `apps/web/src/app/(auth)/admin/teams/[teamId]/page.tsx`; captain team pages consume T038 for history
- [X] T041a [US4] Accessibility checkpoint: roster removal confirmation and history panel keyboard access (extend `accessibility-verification-e2.md` §US4)
- [X] T042 [US4] After end membership, refresh `apps/web/src/lib/teams/affiliation-summary.ts` so fighter returns `unaffiliated` on `GET /me/team-affiliation` per FR-014

**Checkpoint**: Ten scripted removals retain historical rows retrievable by admin (SC-003 evidence path).

---

## Phase 7: User Story 5 — Team-agnostic roles unchanged (Priority: P3)

**Goal**: Marshals and FAC admins operate without team membership; hybrid marshal+fighter users retain marshal capabilities when fighter-unaffiliated (FR-008, FR-009, SC-005).

**Independent Test**: Marshal account with no team completes E1 marshal-smoke paths with zero forced team-application steps; FAC admin manages teams without roster membership.

### Implementation for User Story 5

- [X] T043 [US5] Audit all new authenticated layouts under `apps/web/src/app/(auth)/` and ensure marshal-only users are not redirected to team apply (navigation guard in shared layout or `me/page.tsx`)
- [X] T044 [US5] Add explicit permission regression helpers in `apps/web/src/lib/teams/permissions.ts` documenting matrix: marshal/FAC admin bypass team membership for global operational routes (re-export or comment contract for future routes)
- [X] T045 [US5] Verify FAC admin team routes use `requireFacAdmin` only (no captain/membership prerequisite) and document in `apps/web/src/lib/teams/permissions.ts`
- [X] T046 [US5] Add hybrid-user seed notes to `apps/web/scripts/seed-dev-users.ts` (marshal without team, fighter+marshal without fighter membership) for manual SC-005 validation

**Checkpoint**: SC-005 manual path in quickstart.md step 6 passes without new blockers.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Optional public roster, demo seeds, automated SC evidence, accessibility, constitution alignment, quickstart validation.

- [X] T047 [P] Implement GET `apps/web/src/app/api/public/teams/[teamId]/route.ts` and GET `apps/web/src/app/api/public/teams/[teamId]/roster/route.ts` gated by `PUBLIC_TEAM_ROSTER` per openapi `/public/teams/*` and research.md §9
- [X] T048 [P] Add optional public team page `apps/web/src/app/(public)/teams/[teamId]/page.tsx` consuming public APIs when flag enabled
- [X] T049 [P] Add demo seed script `apps/web/scripts/seed-teams-demo.ts` (sample team + captain assignment) referenced from `specs/002-teams-rosters/quickstart.md`
- [X] T050 [P] Add Vitest suite `apps/web/tests/unit/teams/membership-service.test.ts` covering state transitions, dual-affiliation guard, self-approval block, last-captain guard, **re-apply after `rejected`** (new `pending` row + **new** `team_membership.id`; rejected row id unchanged), and **ended row id immutability** on any subsequent apply (FR-012; SC-001, SC-002 foundations)
- [X] T051 [P] Add Vitest suite `apps/web/tests/integration/teams/permissions.test.ts` for cross-team captain denial and non-captain approve denial with audit assertions (SC-002)
- [X] T052 [P] Add Playwright spec `apps/web/e2e/teams-roster.spec.ts` with journeys: unaffiliated apply → approve (SC-004), cross-team denial (SC-001), marshal without team (SC-005), captain + **FAC admin** roster end and history (SC-003, FR-007)
- [X] T053 Run manual checklist in `specs/002-teams-rosters/quickstart.md` on a clean clone and fix script/env gaps
- [X] T054 Constitution pass: ensure roster approve/reject/end logic lives only in `apps/web/src/lib/teams/membership-service.ts` (no duplicated decision branches in route handlers) per plan.md modularity
- [X] T055 [P] Finalize `apps/web/docs/accessibility-verification-e2.md` for US3 squire flows, optional public team pages (T047–T048), and full-matrix sign-off per spec.md Accessibility expectations (baseline created in T030a)
- [X] T056 UX copy pass for **unaffiliated**, pending, rejected, dual-affiliation blocked, and last-captain messages across `apps/web/src/app/(auth)/me/**` and `apps/web/src/app/(auth)/admin/teams/**`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No prerequisites beyond E1 — start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user stories**.
- **Phases 3–7 (US1–US5)**: Each depends on Phase 2. Recommended sequential order: **US1 → US2 → US3 → US4 → US5** for lowest integration risk.
- **Phase 8 (Polish)**: Depends on completion of user stories targeted for release (minimum **US1 + US2** for demo; US1–US5 for full epic).

### User Story Dependencies

| Story | Priority | Depends on | Notes |
|-------|----------|------------|-------|
| US1 | P1 | Phase 2 | Teams + captains required before meaningful apply/approve |
| US2 | P1 | Phase 2, **US1** (teams + captains exist) | MVP fighter workflow |
| US3 | P2 | US2 (shared apply/decide/roster APIs) | Squire branch + UI labeling |
| US4 | P2 | US2 (active memberships to end) | History APIs + removal UI |
| US5 | P3 | US2–US4 (regression over full surface) | Mostly guards + tests |

### User Story Completion Order (MVP → full epic)

```text
Phase 2 ──► US1 (P1) ──► US2 (P1) ──► US3 (P2) ──► US4 (P2) ──► US5 (P3) ──► Polish
```

### Within Each User Story

- Zod-validate requests using `apps/web/src/lib/teams/contracts.ts` before service calls.
- Route handlers stay thin: permissions → `membership-service` / team CRUD → audit in same transaction where feasible.
- UI confirmations for reject, remove, deactivate per spec.md Accessibility expectations.

### Parallel Opportunities

- **Phase 1**: T003 parallel with T001–T002 after T002 creates files.
- **Phase 2**: T006 and T007 parallel; T004+T005 must be sequential on `schema.ts`.
- **Phase 3**: T017 and T018 parallel after admin APIs (T011–T016, T016a).
- **Phase 4**: T027 and T028 parallel after captain/fighter APIs (T021–T026).
- **Phase 8**: T047, T048, T049, T050, T051, T052, T055 parallel across different files.

---

## Parallel Example: User Story 1 (admin UI)

```bash
# After T011–T016 APIs stable:
Task: "Build apps/web/src/app/(auth)/admin/teams/page.tsx"
Task: "Build apps/web/src/app/(auth)/admin/teams/[teamId]/page.tsx"
```

---

## Parallel Example: User Story 2 (fighter + captain UI)

```bash
# After T021–T026 APIs stable:
Task: "Build apps/web/src/app/(auth)/me/team-affiliation/page.tsx"
Task: "Build apps/web/src/app/(auth)/captain/teams/[teamId]/pending/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1) — teams and captains.
3. Complete Phase 4 (US2) — fighter apply/approve and unaffiliated UX.
4. **STOP and validate** [quickstart.md](./quickstart.md) manual path (SC-004) and spot-check SC-001/SC-002 via T050–T052 or manual steps.
5. Demo or deploy thin roster MVP.

### Incremental Delivery

1. Foundation (Phases 1–2) → schema + domain lib ready.
2. Add US1 → test independently → FAC can stand up teams.
3. Add US2 → test → fighters can affiliate (core epic value).
4. Add US3 → squire parity.
5. Add US4 → removals + history (SC-003).
6. Add US5 → permission regression (SC-005).
7. Polish → public flag, seeds, automated suites, a11y artifact.

### Parallel Team Strategy

- Developer A: Phase 3 (US1) admin APIs + UI.
- Developer B: After US1 lands, Phase 4 (US2) membership APIs.
- Developer C: After US2 APIs land, Phase 4 UI + Phase 5 (US3) labeling.
- Developer D: Phase 6 (US4) history/end routes once roster exists.

---

## Notes

- Map openapi paths to Next.js Route Handlers under `apps/web/src/app/api/**` (e.g. `POST /admin/teams` → `api/admin/teams/route.ts`).
- Do **not** add `team_captain` to `operational_role` seed data (data-model.md §8).
- History, roster, and end routes are defined in `specs/002-teams-rosters/contracts/openapi.yaml` (`adminGetTeamRoster`, `adminEndMembership`, `captainGetRoster`, `captainEndMembership`, `memberGetTeamRoster`, `adminListMembershipHistory`, `captainListMembershipHistory`). **Transfer** = end on source team + apply/decide on destination (see research.md §6).
- `team_membership.id` must remain stable for the life of a row (FR-012); never reuse IDs across re-applies.
