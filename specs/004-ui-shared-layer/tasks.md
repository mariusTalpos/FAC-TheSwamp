---
description: "Task list for Epic 004 — UI Shared Layer"
---

# Tasks: UI Shared Layer (Epic 004)

**Input**: Design documents from `/specs/004-ui-shared-layer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-modules.md, contracts/migration-checklist.md, quickstart.md

**Tests**: Included per FR-010 — `client.test.ts`, `use-api-resource.test.ts`, optional server-loader test. Existing `lib/events` and `lib/teams` suites must pass unchanged.

**Organization**: Tasks grouped by user story (US1–US5) after setup/foundation. Implementation order per plan: FR-001 → FR-004 → FR-005 (events) → FR-003/FR-006 → Phase B → Phase C.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to spec.md user stories (US1–US5)
- All paths relative to repo root unless noted

## Path Conventions

- Web app: `apps/web/src/`, `apps/web/tests/`
- Auth routes: `apps/web/src/app/(auth)/`
- Spec artifacts: `specs/004-ui-shared-layer/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline metrics, directory scaffold, and phase tracking before code changes.

- [x] T001 Record SC-005 LOC baseline with `wc -l` on `apps/web/src/app/(auth)/events/**/*.tsx` and `apps/web/src/app/(auth)/organizer/events/**/*.tsx`; save output in PR notes or `specs/004-ui-shared-layer/contracts/migration-checklist.md`
- [x] T002 Record SC-001 baseline: `rg -c 'setError\(typeof data\.message' apps/web/src/app` output in `specs/004-ui-shared-layer/contracts/migration-checklist.md`
- [x] T003 [P] Create `apps/web/src/components/ui/` directory (empty placeholder or `.gitkeep` until components land)
- [x] T004 [P] Create `apps/web/src/lib/ui/server-loaders/` and `apps/web/src/lib/ui/labels/` directories per plan.md structure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared HTTP client (FR-001) — required by all migrated client pages and hooks.

**⚠️ CRITICAL**: No user story migration work until T005–T007 complete.

- [x] T005 Implement `ApiClientError`, `parseProblemMessage`, `apiGet`, `apiPost`, and `apiJson` in `apps/web/src/lib/api/client.ts` per `specs/004-ui-shared-layer/contracts/ui-modules.md` (consume existing `apps/web/src/lib/api/problem-json.ts`)
- [x] T006 [P] Implement 401 redirect to `/login` and `credentials: "same-origin"` behavior in `apps/web/src/lib/api/client.ts` (browser client components only)
- [x] T007 [P] Add unit tests in `apps/web/tests/unit/api/client.test.ts` — ≥90% branch coverage on `parseProblemMessage` and error paths (FR-010, SC-004)

**Checkpoint**: `cd apps/web && pnpm test tests/unit/api/client.test.ts` passes.

---

## Phase 3: User Story 1 — Consistent errors and feedback (Priority: P1) 🎯 MVP

**Goal**: Single accessible error and success presentation path wired to shared client messages (FR-004 partial, US1 acceptance scenarios).

**Independent Test**: Trigger the same API validation failure from two migrated screens; both show `ProblemAlert` with server message. Successful mutation shows `SuccessMessage` and one reload.

### Implementation for User Story 1

- [x] T008 [P] [US1] Implement `ProblemAlert` in `apps/web/src/components/ui/problem-alert.tsx` (`role="alert"`, optional `onDismiss`, WCAG 2.1 AA)
- [x] T009 [P] [US1] Implement `SuccessMessage` in `apps/web/src/components/ui/success-message.tsx`
- [x] T010 [US1] Add barrel exports in `apps/web/src/components/ui/index.ts` for `ProblemAlert` and `SuccessMessage`

**Checkpoint**: Components render in isolation; client `ApiClientError.userMessage` maps cleanly to `ProblemAlert` props.

---

## Phase 4: User Story 2 — Shared presentation for lists and entity summaries (Priority: P1)

**Goal**: Reusable list rows, status badges, and empty states for events and teams (FR-004, FR-005).

**Independent Test**: Fighter `/events` and organizer `/organizer/events` use the same `EventListRow`; same lifecycle status shows identical `StatusBadge` on fighter and organizer detail.

### Implementation for User Story 2

- [x] T011 [P] [US2] Add event status label maps in `apps/web/src/lib/ui/labels/events.ts` (lifecycle, registration, schedule)
- [x] T012 [P] [US2] Add team status label maps in `apps/web/src/lib/ui/labels/teams.ts` (membership, application, team active)
- [x] T013 [P] [US2] Implement `StatusBadge` in `apps/web/src/components/ui/status-badge.tsx` using label maps and non-color-only cues
- [x] T014 [P] [US2] Implement `EmptyState` in `apps/web/src/components/ui/empty-state.tsx`
- [x] T015 [P] [US2] Implement `EntityList` in `apps/web/src/components/ui/entity-list.tsx`
- [x] T016 [US2] Implement `EventListRow` in `apps/web/src/components/ui/event-list-row.tsx` with props from `@/lib/events/contracts` (`EventListItem` | `EventResponse`)
- [x] T017 [US2] Extend `apps/web/src/components/ui/index.ts` to export all US2 primitives

**Checkpoint**: Storybook-style manual render or temporary dev page confirms shared row + badge; no duplicate `<li>` markup in new code.

---

## Phase 5: User Story 3 — Shared client data loading (Priority: P2)

**Goal**: Replace ad-hoc `useState`/`useEffect`/`fetch` with `useApiResource` (FR-003).

**Independent Test**: On a migrated hook-based page, loading shows on mount; after successful POST, exactly one GET reload (no duplicate parallel fetches).

### Tests for User Story 3

- [x] T018 [P] [US3] Add unit tests in `apps/web/tests/unit/hooks/use-api-resource.test.ts` — reload, `runMutation` success/failure, `resourceKey` reset/abort (FR-010)

### Implementation for User Story 3

- [x] T019 [US3] Implement `useApiResource` in `apps/web/src/hooks/use-api-resource.ts` per `specs/004-ui-shared-layer/contracts/ui-modules.md`

**Checkpoint**: `cd apps/web && pnpm test tests/unit/hooks/use-api-resource.test.ts` passes.

---

## Phase 6: User Story 4 — Server-first reads (Priority: P2)

**Goal**: Read-heavy event routes load initial data in Server Components via domain services (FR-006); client islands for mutations only.

**Independent Test**: With JavaScript disabled, `/events` shows list or `EmptyState` in HTML; with JS enabled, register/withdraw still work via client island.

### Tests for User Story 4

- [x] T020 [P] [US4] Add unit test `apps/web/tests/unit/ui/server-loaders/events.test.ts` mocking event service; assert DTO shape matches contracts

### Implementation for User Story 4

- [x] T021 [P] [US4] Implement `loadFighterEventsList`, `loadOrganizerEventsList`, and `loadEventDetailForSession` in `apps/web/src/lib/ui/server-loaders/events.ts` (no direct `db` import in pages)
- [x] T022 [P] [US4] Add team loader stubs in `apps/web/src/lib/ui/server-loaders/teams.ts` for Phase B consumption
- [x] T023 [US4] Convert `apps/web/src/app/(auth)/events/page.tsx` to async Server Component using `loadFighterEventsList`, `EntityList`, `EventListRow`, `EmptyState`
- [x] T024 [US4] Convert `apps/web/src/app/(auth)/events/[eventId]/page.tsx` to server-first metadata; extract client mutations to `apps/web/src/app/(auth)/events/[eventId]/event-detail-actions.tsx` using shared client + `ProblemAlert`/`SuccessMessage`
- [x] T025 [US4] Convert `apps/web/src/app/(auth)/organizer/events/[eventId]/page.tsx` to server-first with client action island for publish/cancel

**Checkpoint**: Quickstart step 4 (no-JS first paint on fighter event list) passes.

---

## Phase 7: User Story 5 — Incremental migration coverage (Priority: P3)

**Goal**: Complete Phases A→B→C per migration checklist; phase gates with grep and tests (FR-002, FR-009, US5).

**Independent Test**: After each phase, existing domain tests pass and checklist rows are checked; Phase A = 100% event routes migrated.

### Phase A — Events (US5.1)

- [x] T026 [US5] Migrate `apps/web/src/app/(auth)/organizer/events/page.tsx` to `useApiResource`, shared client, `EventListRow`, `EntityList`, `EmptyState`, `ProblemAlert`, `SuccessMessage` (remove inline `fetch` parsing)
- [x] T027 [US5] Migrate `apps/web/src/app/(auth)/organizer/events/[eventId]/registrations/page.tsx` per `specs/004-ui-shared-layer/contracts/migration-checklist.md`
- [x] T028 [US5] Migrate `apps/web/src/app/(auth)/organizer/events/[eventId]/schedule/page.tsx` per migration checklist
- [x] T029 [US5] Migrate `apps/web/src/app/(auth)/admin/events/[eventId]/page.tsx` per migration checklist
- [x] T030 [US5] Mark Phase A rows checked in `specs/004-ui-shared-layer/contracts/migration-checklist.md`
- [x] T031 [US5] Run Phase A gate: `rg 'setError\(typeof data\.message' apps/web/src/app/\(auth\)/events apps/web/src/app/\(auth\)/organizer/events` returns zero; re-run `wc -l` and confirm ≥25% LOC reduction vs T001 baseline (SC-005)

### Phase B — Teams / captain / me (US5.2)

- [x] T032 [US5] Migrate `apps/web/src/app/(auth)/me/team-affiliation/page.tsx` — shared client, hook, `ProblemAlert`, `StatusBadge`, `EmptyState`
- [x] T033 [US5] Migrate `apps/web/src/app/(auth)/captain/teams/[teamId]/roster/page.tsx`
- [x] T034 [US5] Migrate `apps/web/src/app/(auth)/captain/teams/[teamId]/pending/page.tsx`
- [x] T035 [US5] Mark Phase B rows checked in `specs/004-ui-shared-layer/contracts/migration-checklist.md`; run `cd apps/web && pnpm test`

### Phase C — Admin / account (US5.3)

- [x] T036 [US5] Migrate `apps/web/src/app/(auth)/admin/users/page.tsx`
- [x] T037 [US5] Migrate `apps/web/src/app/(auth)/admin/users/[userId]/audit/page.tsx`
- [x] T038 [US5] Migrate `apps/web/src/app/(auth)/admin/teams/page.tsx`
- [x] T039 [US5] Migrate `apps/web/src/app/(auth)/admin/teams/overview/page.tsx`
- [x] T040 [US5] Migrate `apps/web/src/app/(auth)/admin/teams/[teamId]/page.tsx`
- [x] T041 [US5] Migrate `apps/web/src/app/(auth)/me/fighter-profile/page.tsx`
- [x] T042 [US5] Mark Phase C rows checked in migration checklist; confirm intentional exceptions unchanged (`admin/users/[userId]/page.tsx`, `me/page.tsx`)
- [x] T043 [US5] Run full regression: `cd apps/web && pnpm test` — `lib/events` and `lib/teams` suites unchanged (SC-004)

**Checkpoint**: All in-scope checklist rows checked except documented v1 exceptions.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: CI guards, accessibility, quickstart evidence, constitution pass.

- [x] T044 [P] Add optional `lint:ui-duplication` script in `apps/web/package.json` grepping migrated `(auth)` paths for `setError(typeof data.message` (SC-001)
- [x] T045 [P] Accessibility spot-check `ProblemAlert` and `StatusBadge` per `specs/004-ui-shared-layer/quickstart.md` (keyboard, screen reader, non-color-only status)
- [x] T046 Execute `specs/004-ui-shared-layer/quickstart.md` steps 1–8; record SC-001–SC-005 evidence in PR description
- [x] T047 Constitution pass: scan `apps/web/src/app/(auth)/` for remaining inline `fetch` + ad-hoc error parsing outside exceptions; file follow-ups if any

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Foundational (client)
- **US2 (Phase 4)**: Depends on Foundational; can start in parallel with US1 after T005 (different files)
- **US3 (Phase 5)**: Depends on Foundational (client); benefits from US1 components for integration tests
- **US4 (Phase 6)**: Depends on US2 primitives (list row, badges, empty state)
- **US5 Phase A (Phase 7)**: Depends on US1–US4 for event routes (US4 covers 3 server routes; T026–T029 cover remaining hook pages)
- **US5 Phase B/C**: Depends on Phase A gate for events; Phase B before Phase C recommended
- **Polish (Phase 8)**: Depends on desired migration phases complete

### User Story Dependencies

| Story | Depends on | Delivers independently |
|-------|------------|------------------------|
| US1 | Foundational | Error/success components + client messages |
| US2 | Foundational | List/badge/empty primitives |
| US3 | Foundational | `useApiResource` hook |
| US4 | US2 | Server-first fighter/organizer event reads |
| US5 | US1–US4 | Phased page migrations + gates |

### Within Each User Story

- Tests for client/hook/server-loader written alongside or immediately after module implementation
- Label maps before `StatusBadge`
- Server loaders before server page conversions
- Phase A event migrations before Phase B teams

### Parallel Opportunities

- **Phase 1**: T003 ∥ T004
- **Phase 2**: T006 ∥ T007 (after T005 types exist)
- **US1**: T008 ∥ T009
- **US2**: T011–T015 all parallel; T016 after label maps (T011)
- **US4**: T020 ∥ T021 ∥ T022; T023–T025 sequential (same domain, different routes)
- **US5 Phase C**: T036–T041 largely parallel across different admin pages
- **Polish**: T044 ∥ T045

---

## Parallel Example: User Story 2

```bash
# After T005 completes, launch label maps and simple components together:
# T011 — apps/web/src/lib/ui/labels/events.ts
# T012 — apps/web/src/lib/ui/labels/teams.ts
# T014 — apps/web/src/components/ui/empty-state.tsx
# T015 — apps/web/src/components/ui/entity-list.tsx
# Then T013 StatusBadge (needs T011/T012) and T016 EventListRow
```

---

## Parallel Example: User Story 5 Phase C

```bash
# Different page files — can split across developers after Phase B gate:
# T036 admin/users/page.tsx
# T038 admin/teams/page.tsx
# T039 admin/teams/overview/page.tsx
# T041 me/fighter-profile/page.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 + Foundation)

1. Complete Phase 1 Setup (T001–T004)
2. Complete Phase 2 Foundational (T005–T007)
3. Complete Phase 3 US1 (T008–T010)
4. **STOP and VALIDATE**: Client tests + manual `ProblemAlert` with forced API error
5. Optionally add US2 `EventListRow` next for visible list deduplication (still P1)

### Incremental Delivery (recommended)

1. Foundation + US1 + US2 → shared building blocks ready
2. US3 hook → unlocks organizer list and interactive pages
3. US4 server-first fighter routes → SC-003 first paint
4. US5 Phase A → event epic slice shippable (SC-005)
5. US5 Phase B → teams/captain
6. US5 Phase C → admin/account
7. Polish → SC-001 CI guard, quickstart sign-off

### Suggested MVP Scope

**Minimum shippable slice**: Phases 1–3 (Setup + Foundational + US1) — consistent errors everywhere new code touches.

**First product increment**: Through US2 + US4 fighter `/events` list (shared row + server-first list).

**Phase A complete**: Through T031 (all 7 event routes per migration checklist).

---

## Notes

- Do **not** change `apps/web/src/app/api/**` contracts or domain business rules (FR-007)
- Use existing `export type` from `apps/web/src/lib/events/contracts.ts` and teams contracts (FR-008)
- `admin/users/[userId]/page.tsx` stays exception (direct DB) until backend-consistency epic
- Capture T001 baseline **before** merging Phase A to measure SC-005
- Commit after each phase checkpoint; run `pnpm test` at each US5 gate
