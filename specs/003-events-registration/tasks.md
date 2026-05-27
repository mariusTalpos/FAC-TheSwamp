---
description: "Implementation tasks for Events & Registration (Epic E3)"
---

# Tasks: Events & Registration (Epic E3)

**Input**: Design documents from `/specs/003-events-registration/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml), [research.md](./research.md), [quickstart.md](./quickstart.md). **E1 and E2 complete** (users, operational roles, fighter profiles, teams/rosters, audit baseline).

**Tests**: Automated verification is **expected** per [spec.md](./spec.md) Verification expectations and SC-001–SC-005. Vitest and Playwright tasks are in **Phase 9 (Polish)**; story phases focus on deliverable APIs/UI with manual checkpoints per [quickstart.md](./quickstart.md).

**Organization**: Phases follow user story priority (P1–P3) after E3 setup and foundational schema/domain work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no dependency on incomplete tasks in the same batch)
- **[USn]**: User story label from [spec.md](./spec.md)
- Paths follow [plan.md](./plan.md) (`apps/web/` Next.js app)

---

## Phase 1: Setup (E3 Shared Infrastructure)

**Purpose**: E3 module layout, API contracts, timezone library, and environment flags on top of the existing E1/E2 app.

- **Time policy (Luxon)**:
  - Persist event/window/schedule timestamps as **UTC instants** (`timestamptz`).
  - Store `event.timezone` as an **IANA timezone** string (default **`America/New_York`**).
  - Parse organizer-entered local date/time **in `event.timezone`**, convert to UTC for storage.
  - Render schedule/windows/deadlines in the **event timezone** with visible timezone text.

- [x] T001 Add `PUBLIC_EVENTS` (default `false`) to `apps/web/.env.example` and document in `specs/003-events-registration/quickstart.md` per research.md §9
- [x] T002 Create `apps/web/src/lib/events/` module skeleton (`permissions.ts`, `event-service.ts`, `registration-service.ts`, `schedule-service.ts`, `affiliation-snapshot.ts`, `audit.ts`, `contracts.ts`, `http-errors.ts`) per plan.md Project Structure
- [x] T003 [P] Add Zod request/response schemas in `apps/web/src/lib/events/contracts.ts` mirroring `EventCreateRequest`, `EventUpdateRequest`, `EventPublishRequest`, `EventCancelRequest`, registration, schedule, and admin DTOs from `specs/003-events-registration/contracts/openapi.yaml`
- [x] T004 [P] Add `luxon` dependency and timezone helpers in `apps/web/src/lib/events/timezone.ts` for registration window and schedule display enforcement per research.md §5 (document choice + default `America/New_York` in `specs/003-events-registration/quickstart.md`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database tables, migrations, permission layer, event lifecycle, registration state machine (capacity/waitlist with FIFO in v1), schedule service with overlap detection and change-record writes, affiliation snapshot, and audit vocabulary. **No user-story routes or UI** until this phase completes.

**⚠️ CRITICAL**: User story phases MUST NOT start until this checkpoint passes.

- [x] T005 Add Drizzle enums and tables `event`, `event_registration`, `schedule_entry`, `schedule_change_record` in `apps/web/src/lib/db/schema.ts` per `specs/003-events-registration/data-model.md` (lifecycle/registration/schedule status enums, partial unique index on active registrations, list index on `(lifecycle_status, starts_at)`; **no `format_key` on event** per data-model.md §1.2)
- [x] T006 Generate and commit E3 migration SQL under `apps/web/drizzle/migrations/` from T005 schema (`pnpm db:generate` / `pnpm db:migrate` workflow)
- [x] T007 [P] Add event audit `event_type` constants and `writeEventAuditEvent` helper in `apps/web/src/lib/events/audit.ts` wrapping `apps/web/src/lib/audit/write-audit-event.ts` with payloads including `event_id`, `registration_id`, `schedule_entry_id`, and before/after fields per research.md §10 and FR-014 (include `registration.action_denied` for unauthorized role/permission attempts)
- [x] T008 [P] Implement event-scoped permission helpers in `apps/web/src/lib/events/permissions.ts` (`canCreateEvent`, `canManageEvent`, `canSanctionEvent`, `canReassignOrganizer`, `canSelfRegisterFighter`, `canSelfRegisterStaff`, `canViewRegistrationSummary`, `canViewScheduleAsParticipant`) evaluated **alongside** E1 `apps/web/src/lib/rbac/` session roles per research.md §2 and data-model.md §5
- [x] T009 [P] Implement affiliation snapshot reader in `apps/web/src/lib/events/affiliation-snapshot.ts` using E2 `apps/web/src/lib/teams/affiliation-summary.ts` / active membership queries to populate optional `team_id`, `team_membership_id`, `team_name_snapshot` at fighter confirm time (informational only; no captain gate) per FR-006
- [x] T010 Implement event lifecycle service in `apps/web/src/lib/events/event-service.ts` (`create`, `update`, `publish`, `closeRegistration`, `start`, `complete`, `cancel` with registration cascade to `cancelled`, `sanction` / `revokeSanction`, `reassignOrganizer` with target must hold global `organizer` role) per data-model.md §1 and FR-001, FR-010b–FR-010d
- [x] T011 Implement registration state machine in `apps/web/src/lib/events/registration-service.ts` (`registerFighter`, `confirmFighterAttendance`, `registerFighterOnBehalf`, `registerStaff`, self/organizer withdraw, duplicate guard, registration window enforcement, disabled-user block, waitlist promote on capacity free in same transaction via swappable `WaitlistPromotionPolicy` (default FIFO), automatic `registration_closes_at` enforcement, withdrawal of unconfirmed registrations at attendance confirmation deadline) per data-model.md §2 and research.md §§3–4
- [x] T012 Implement schedule service in `apps/web/src/lib/events/schedule-service.ts` (`listBoard`, `createEntry`, `updateEntry` writing `schedule_change_record` rows + audit, overlap detection returning `warnings[]`, `acknowledgeScheduleWarnings` gate) per data-model.md §§3–4 and research.md §7

**Checkpoint**: Migrations apply; domain services unit-testable; permission helpers callable from route handlers.

---

## Phase 3: User Story 1 — Create and publish a sanctioned event (Priority: P1) 🎯 MVP

**Goal**: Global `organizer` role holders and FAC admins create/publish/cancel events; sole per-event organizer ownership; FAC sanction and organizer reassignment with audit (FR-001, FR-002, FR-003, FR-010, FR-010a–FR-010d).

**Independent Test**: As `organizer@fac.test`, create draft event, publish with registration open, verify creator is sole organizer; second organizer cannot edit; FAC admin can reassign organizer and sanction event.

### Implementation for User Story 1

- [x] T013 [US1] Implement POST `apps/web/src/app/api/events/route.ts` mapping openapi `POST /events` (create draft, set `organizer_user_id` to creator, audit `event.created`, Zod + `canCreateEvent`)
- [x] T014 [US1] Implement GET `apps/web/src/app/api/events/route.ts` mapping openapi `GET /events` (upcoming published events for authenticated users, indexed query per FR-009)
- [x] T015 [US1] Implement GET and PATCH `apps/web/src/app/api/events/[eventId]/route.ts` mapping openapi `GET/PATCH /events/{eventId}` (`canManageEvent` for patch; cross-organizer 403 + audit `event.action_denied`)
- [x] T016 [US1] Implement POST `apps/web/src/app/api/events/[eventId]/publish/route.ts` mapping openapi `POST /events/{eventId}/publish` (validate required metadata, set `published_at`, audit `event.published`)
- [x] T017 [US1] Implement POST `apps/web/src/app/api/events/[eventId]/close-registration/route.ts` mapping openapi `POST /events/{eventId}/close-registration`
- [x] T017c [US1] Implement POST `apps/web/src/app/api/events/[eventId]/reopen-registration/route.ts` mapping openapi `POST /events/{eventId}/reopen-registration` (manual override, audit `event.registration_reopened`)
- [x] T017a [US1] Implement POST `apps/web/src/app/api/events/[eventId]/start/route.ts` mapping openapi `POST /events/{eventId}/start` (set lifecycle to `in_progress`, audit `event.started`)
- [x] T017b [US1] Implement POST `apps/web/src/app/api/events/[eventId]/complete/route.ts` mapping openapi `POST /events/{eventId}/complete` (set lifecycle to `completed`, audit `event.completed`)
- [x] T018 [US1] Implement POST `apps/web/src/app/api/events/[eventId]/cancel/route.ts` mapping openapi `POST /events/{eventId}/cancel` (cascade registrations to `cancelled`, optional `cancellation_reason`, audit `event.cancelled`)
- [x] T019 [US1] Implement POST and DELETE `apps/web/src/app/api/admin/events/[eventId]/sanction/route.ts` mapping openapi `POST/DELETE /admin/events/{eventId}/sanction` (`canSanctionEvent` only, audit `event.sanctioned` / `event.sanction_revoked`)
- [x] T020 [US1] Implement POST `apps/web/src/app/api/admin/events/[eventId]/organizer/route.ts` mapping openapi `POST /admin/events/{eventId}/organizer` (409 when target lacks global `organizer` role, audit `event.organizer_reassigned`)
- [x] T021 [P] [US1] Build organizer event list and create UI in `apps/web/src/app/(auth)/organizer/events/page.tsx` with accessible form labels, timezone + datetime inputs, venue, optional description (no event-level format enum), optional fighter attendance confirmation requirement (days before start) per spec.md Accessibility expectations
- [x] T022 [P] [US1] Build organizer event detail/edit UI in `apps/web/src/app/(auth)/organizer/events/[eventId]/page.tsx` for metadata edit, publish, close registration, start, complete, and cancel with confirmation
- [x] T023 [P] [US1] Build FAC admin event oversight UI in `apps/web/src/app/(auth)/admin/events/[eventId]/page.tsx` for sanction toggle, organizer reassignment, and cancel-with-reason
- [x] T024 [US1] Add organizer navigation entry in shared auth layout (visible when session user has global `organizer` role or is `fac_admin`) linking to `organizer/events`
- [x] T025 [US1] Wire audit + 403 denial paths for non-owner organizer mutations (write `event.action_denied` when global organizer attempts edit on another user's event per US1 scenario 4)
- [x] T025a [US1] Accessibility checkpoint: keyboard path and accessible names on organizer create/edit, publish confirmation, admin sanction/reassign; record in `apps/web/docs/accessibility-verification-e3.md` §US1

**Checkpoint**: Organizer can create/publish events; cross-organizer edit denied; FAC admin can sanction and reassign organizer.

---

## Phase 4: User Story 2 — Fighter self-registration for all events (Priority: P1)

**Goal**: Fighters self-register and withdraw without captain approval; unaffiliated fighters succeed; capacity/waitlist FIFO; duplicate blocked (FR-004, FR-005, FR-006, FR-008).

**Independent Test**: Publish event; affiliated and unaffiliated fighters self-register; duplicate blocked; at-capacity waitlist; self-withdraw frees capacity and promotes waitlist.

### Implementation for User Story 2

- [x] T026 [US2] Implement POST `apps/web/src/app/api/events/[eventId]/registrations/fighter/route.ts` mapping openapi `POST /events/{eventId}/registrations/fighter` via `registration-service.registerFighter` (fighter profile required, affiliation snapshot optional, 409 duplicate/closed; on 403/role/eligibility denial ensure audit `registration.action_denied`)
- [x] T027 [US2] Implement POST `apps/web/src/app/api/events/[eventId]/registrations/fighter/withdraw/route.ts` mapping openapi `POST /events/{eventId}/registrations/fighter/withdraw` (audit `registration.fighter_withdrawn`, waitlist promotion)
- [x] T027a [US2] Implement POST `apps/web/src/app/api/events/[eventId]/registrations/fighter/confirm/route.ts` mapping openapi `POST /events/{eventId}/registrations/fighter/confirm` (audit `registration.fighter_confirmed`; 409 when confirmation not applicable)
- [x] T028 [US2] Implement GET `apps/web/src/app/api/events/[eventId]/registrations/me/route.ts` mapping openapi `GET /events/{eventId}/registrations/me` (session user's fighter/staff registrations for event)
- [x] T029 [P] [US2] Build fighter upcoming events list UI in `apps/web/src/app/(auth)/events/page.tsx` consuming `GET /api/events`
- [x] T030 [P] [US2] Build fighter event detail UI in `apps/web/src/app/(auth)/events/[eventId]/page.tsx` with self-register, withdraw, registration status, and optional team affiliation display (informational) per FR-006
- [x] T030a [US2] Extend fighter event detail UI with attendance confirmation CTA/status when the event requires it (visible deadline in event timezone; accessible, keyboard-operable)
- [x] T031 [US2] Update `apps/web/src/app/(auth)/me/page.tsx` to surface upcoming event registrations and link to event detail (SC-005 discoverability)
- [x] T032 [US2] Add clear UX copy for duplicate registration, waitlisted, registration closed, and registration window violations (not color-only status) on fighter event detail
- [x] T032a [US2] Create `apps/web/docs/accessibility-verification-e3.md` baseline covering fighter event list, register/withdraw flow, and `/me` registration links (WCAG 2.1 AA checkpoint per spec.md; extend in later story tasks)
- [x] T032b [US2] Accessibility checkpoint: verify keyboard-operable register/withdraw and timezone-visible datetime text on event detail (document in T032a artifact)

**Checkpoint**: Fighter self-registration works for affiliated and unaffiliated users without captain step (SC-001 manual path); duplicate attempts return understandable errors (SC-002 foundation).

---

## Phase 5: User Story 3 — Staff role registration (Priority: P2)

**Goal**: Users with operational roles (e.g. marshal) register as staff distinct from fighter registration; both may coexist; organizer may register as marshal/fighter for own event (FR-007, FR-010e).

**Independent Test**: Marshal self-registers for event; same user also registers as fighter; organizer registers as marshal for own event; user without marshal role denied.

### Implementation for User Story 3

- [x] T033 [US3] Implement POST `apps/web/src/app/api/events/[eventId]/registrations/staff/route.ts` mapping openapi `POST /events/{eventId}/registrations/staff` via `registration-service.registerStaff` (validate `staff_operational_role_key` against E1 role assignments, optional `staff_capacity` JSONB caps, audit `registration.staff_confirmed`; on 403 role denial ensure audit `registration.action_denied`)
- [x] T034 [US3] Implement POST `apps/web/src/app/api/events/[eventId]/registrations/staff/withdraw/route.ts` mapping openapi `POST /events/{eventId}/registrations/staff/withdraw` (audit `registration.staff_withdrawn`)
- [x] T035 [US3] Extend fighter event detail UI in `apps/web/src/app/(auth)/events/[eventId]/page.tsx` with staff registration section for users holding marshal (or other staff) operational roles, separate from fighter register controls
- [x] T036 [US3] Extend `apps/web/src/lib/events/permissions.ts` and `GET /registrations/me` projection to return distinct fighter vs staff rows for same user (US3 scenario 2) and allow event organizer self-register paths (US3 scenario 3)

**Checkpoint**: Marshal staff registration recorded separately from fighter registration; role mismatch returns clear 403.

---

## Phase 6: User Story 4 — Planned schedule board (Priority: P2)

**Goal**: Organizer/FAC admin builds planned schedule; registered participants read chronological board with timezone text; overlap warnings with optional acknowledge; empty-state UX (FR-011, FR-013).

**Independent Test**: Add schedule entries with start times; participant views ordered board with timezone; overlapping entries warn on save; event without schedule shows "not yet published" copy.

### Implementation for User Story 4

- [x] T037 [US4] Implement GET `apps/web/src/app/api/events/[eventId]/schedule/route.ts` mapping openapi `GET /events/{eventId}/schedule` (`canManageEvent` or registered participant read per permissions)
- [x] T038 [US4] Implement POST `apps/web/src/app/api/events/[eventId]/schedule/entries/route.ts` mapping openapi `POST /events/{eventId}/schedule/entries` via `schedule-service.createEntry` (audit `schedule_entry.created`)
- [x] T039 [US4] Implement PATCH `apps/web/src/app/api/events/[eventId]/schedule/entries/[entryId]/route.ts` mapping openapi `PATCH /events/{eventId}/schedule/entries/{entryId}` returning `ScheduleEntryUpdateResult` with `warnings[]` and `acknowledgeScheduleWarnings` support
- [x] T040 [P] [US4] Build organizer schedule board UI in `apps/web/src/app/(auth)/organizer/events/[eventId]/schedule/page.tsx` (create/edit entries, overlap warning acknowledgment, link from event detail)
- [x] T041 [P] [US4] Extend participant event detail in `apps/web/src/app/(auth)/events/[eventId]/page.tsx` with read-only schedule panel (chronological, timezone in visible text, empty-state "schedule not yet published" per US4 scenario 4)
- [x] T042 [US4] Add schedule entry form components with accessible labels for label, start time, duration/end, optional registration link, and placeholder slot fields
- [x] T042a [US4] Accessibility checkpoint: keyboard-operable schedule board view and edit forms; timezone context in text (extend `accessibility-verification-e3.md` §US4)

**Checkpoint**: Organizer can maintain planned schedule; registered participants see readable board or explicit empty state.

---

## Phase 7: User Story 5 — Schedule change log and as-run divergence (Priority: P2)

**Goal**: Material schedule edits append change records and audit; FAC admin/organizer can review ordered history; delayed/cancelled entry status visible to participants (FR-012, FR-014, SC-003).

**Independent Test**: Move schedule entry start time with optional reason; FAC admin retrieves ordered change log with actor/timestamp; delayed/cancelled entries distinguishable on board.

### Implementation for User Story 5

- [x] T043 [US5] Implement GET `apps/web/src/app/api/events/[eventId]/schedule/changes/route.ts` mapping openapi `GET /events/{eventId}/schedule/changes` (organizer or `fac_admin`, ordered by `created_at`)
- [x] T044 [US5] Ensure `apps/web/src/lib/events/schedule-service.ts` `updateEntry` writes one `schedule_change_record` per changed field (`scheduled_start_at`, `venue_label_override`, `status`, etc.) plus matching audit events per FR-012
- [x] T045 [US5] Add schedule change history panel to `apps/web/src/app/(auth)/organizer/events/[eventId]/schedule/page.tsx` and FAC admin event page consuming T043 (SC-003 reviewer path)
- [x] T046 [US5] Display `planned` / `delayed` / `cancelled` entry status on organizer and participant schedule views using text/badge patterns that do not rely on color alone (spec Accessibility expectations)
- [x] T047 [US5] Support optional `reason` on schedule PATCH body persisted to `schedule_change_record.reason` and surfaced in history list

**Checkpoint**: Ten scripted schedule time changes produce retrievable history with actor and timestamp (SC-003 evidence path).

---

## Phase 8: User Story 6 — Registration visibility and organizer oversight (Priority: P3)

**Goal**: Event organizer and FAC admin view registration summary, filter by kind/status, withdraw registrations with reason, register fighters on behalf; registration-closed policy enforced (FR-006a, US6).

**Independent Test**: Multiple fighter and marshal registrations visible in summary; organizer withdraws one; cross-organizer denied; on-behalf register audited; fighter sees own status only.

### Implementation for User Story 6

- [x] T048 [US6] Implement GET `apps/web/src/app/api/events/[eventId]/registrations/route.ts` mapping openapi `GET /events/{eventId}/registrations` with `kind` and `status` query filters and count aggregates (`canViewRegistrationSummary`)
- [x] T049 [US6] Implement POST `apps/web/src/app/api/events/[eventId]/registrations/[registrationId]/withdraw/route.ts` mapping openapi `POST /events/{eventId}/registrations/{registrationId}/withdraw` (organizer or `fac_admin`, optional reason, audit `registration.withdrawn_by_organizer`, waitlist promotion)
- [x] T050 [US6] Implement POST `apps/web/src/app/api/events/[eventId]/registrations/fighter/on-behalf/route.ts` mapping openapi `POST /events/{eventId}/registrations/fighter/on-behalf` via `registration-service.registerFighterOnBehalf` (403 for non-owner global organizers per FR-006a)
- [x] T051 [P] [US6] Build registration summary UI in `apps/web/src/app/(auth)/organizer/events/[eventId]/registrations/page.tsx` (filters, waitlist list, withdraw with reason, on-behalf fighter register form)
- [x] T052 [US6] Extend FAC admin event page `apps/web/src/app/(auth)/admin/events/[eventId]/page.tsx` with registration summary embed or link and organizer-level withdraw/on-behalf actions
- [x] T053 [US6] Enforce registration-closed blocking on self-register/self-withdraw in `apps/web/src/lib/events/registration-service.ts` unless organizer/admin override paths (US6 scenario 5)
- [x] T053a [US6] Accessibility checkpoint: keyboard-operable registration summary table, withdraw confirmation, and on-behalf form (extend `accessibility-verification-e3.md` §US6)

**Checkpoint**: Organizer manages registrations for owned events only; FAC admin has global oversight; on-behalf path audited.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Optional public events, demo seeds, automated SC evidence, accessibility sign-off, constitution alignment, quickstart validation.

- [x] T054 [P] Implement GET `apps/web/src/app/api/public/events/route.ts` and GET `apps/web/src/app/api/public/events/[eventId]/route.ts` gated by `PUBLIC_EVENTS` per openapi `/public/events/*` and research.md §9
- [x] T055 [P] Add optional public event page `apps/web/src/app/(public)/events/[eventId]/page.tsx` consuming public APIs when flag enabled
- [x] T056 [P] Add demo seed script `apps/web/scripts/seed-events-demo.ts` (published event + sample registrations) referenced from `specs/003-events-registration/quickstart.md`
- [x] T057 [P] Add Vitest suite `apps/web/tests/unit/events/registration-service.test.ts` covering fighter/staff registration, unaffiliated path, duplicate denial, capacity/waitlist FIFO promotion, withdraw promotion, registration window enforcement (SC-001, SC-002 foundations)
- [x] T058 [P] Add Vitest suite `apps/web/tests/integration/events/permissions.test.ts` for cross-organizer edit denial, organizer-as-fighter/marshal registration, on-behalf restricted to event owner/admin, and denied audit assertions
- [x] T059 [P] Add Vitest suite `apps/web/tests/integration/events/schedule-change-log.test.ts` for change record creation on PATCH and ordered history retrieval (SC-003)
- [x] T060 [P] Add Playwright spec `apps/web/e2e/events-registration.spec.ts` with journeys: publish → fighter register → marshal register → view schedule (SC-004), duplicate denial (SC-002), discover event + registration status (SC-005), organizer reassignment (US1)
- [x] T060a [P] Run and document moderated usability checks for SC-005 in `apps/web/docs/usability-e3.md` (test script, participant notes, pass/fail against “find published event + registration status in under 2 minutes”)
- [x] T061 Run manual checklist in `specs/003-events-registration/quickstart.md` on a clean clone and fix script/env gaps
- [x] T062 Constitution pass: ensure registration/waitlist/withdraw logic lives only in `apps/web/src/lib/events/registration-service.ts` and schedule mutations in `schedule-service.ts` (no duplicated branches in route handlers) per plan.md modularity
- [x] T063 [P] Finalize `apps/web/docs/accessibility-verification-e3.md` for staff register, schedule history, registration summary, and optional public event pages (T054–T055)
- [x] T064 UX copy pass for waitlisted, cancelled event, registration closed, cross-organizer denial, and schedule empty/delayed/cancelled states across `apps/web/src/app/(auth)/events/**` and `apps/web/src/app/(auth)/organizer/events/**`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No prerequisites beyond E1/E2 — start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user stories**.
- **Phases 3–8 (US1–US6)**: Each depends on Phase 2. Recommended sequential order: **US1 → US2 → US3 → US4 → US5 → US6** for lowest integration risk.
- **Phase 9 (Polish)**: Depends on completion of user stories targeted for release (minimum **US1 + US2** for thin MVP; US1–US6 for full epic).

### User Story Dependencies

| Story | Priority | Depends on | Notes |
|-------|----------|------------|-------|
| US1 | P1 | Phase 2 | Events must exist before registration or schedule |
| US2 | P1 | Phase 2, **US1** (published events) | Core fighter self-serve path |
| US3 | P2 | US2 (shared event detail + `/registrations/me`) | Staff register extends fighter event surfaces |
| US4 | P2 | US1 (published event), **US2** optional (participant read with registration) | Schedule board; participant read needs registration for private events |
| US5 | P2 | **US4** (schedule entries exist to change) | History API and status UX on existing board |
| US6 | P3 | US2, US3 (registrations to summarize) | Summary/on-behalf/organizer withdraw |

### User Story Completion Order (MVP → full epic)

```text
Phase 2 ──► US1 (P1) ──► US2 (P1) ──► US3 (P2) ──► US4 (P2) ──► US5 (P2) ──► US6 (P3) ──► Polish
```

### Within Each User Story

- Zod-validate requests using `apps/web/src/lib/events/contracts.ts` before service calls.
- Route handlers stay thin: permissions → domain service → audit in same transaction where feasible.
- UI confirmations for cancel, withdraw, and schedule overlap acknowledgment per spec.md Accessibility expectations.

### Parallel Opportunities

- **Phase 1**: T003 and T004 parallel after T002 creates module files.
- **Phase 2**: T007, T008, and T009 parallel; T005→T006 sequential on schema/migrations; T010–T012 sequential on service dependencies after T008.
- **Phase 3**: T021, T022, and T023 parallel after US1 APIs (T013–T020).
- **Phase 4**: T029 and T030 parallel after US2 APIs (T026–T028).
- **Phase 6**: T040 and T041 parallel after US4 APIs (T037–T039).
- **Phase 8**: T051 parallel with T052 after T048–T050 APIs.
- **Phase 9**: T054, T055, T056, T057, T058, T059, T060, T063 parallel across different files.

---

## Parallel Example: User Story 1 (organizer + admin UI)

```bash
# After T013–T020 APIs stable:
Task: "Build apps/web/src/app/(auth)/organizer/events/page.tsx"
Task: "Build apps/web/src/app/(auth)/organizer/events/[eventId]/page.tsx"
Task: "Build apps/web/src/app/(auth)/admin/events/[eventId]/page.tsx"
```

---

## Parallel Example: User Story 2 (fighter discovery UI)

```bash
# After T026–T028 APIs stable:
Task: "Build apps/web/src/app/(auth)/events/page.tsx"
Task: "Build apps/web/src/app/(auth)/events/[eventId]/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1) — create, publish, and govern events.
3. Complete Phase 4 (US2) — fighter self-registration and withdraw.
4. **STOP and validate** [quickstart.md](./quickstart.md) steps 1–5 (partial SC-004) and spot-check SC-001/SC-002 via T057–T060 or manual steps.
5. Demo thin events MVP (publish + register) before schedule and oversight stories.

### Incremental Delivery

1. Foundation (Phases 1–2) → schema + domain lib ready.
2. Add US1 → test independently → organizers can publish events.
3. Add US2 → test → fighters can self-register (core epic value).
4. Add US3 → marshal staffing path.
5. Add US4 → planned schedule board.
6. Add US5 → change history and delayed/cancelled status (SC-003).
7. Add US6 → registration summary and on-behalf overrides.
8. Polish → public flag, seeds, automated suites, a11y artifact, full quickstart (SC-004).

### Parallel Team Strategy

- Developer A: Phase 3 (US1) event APIs + organizer UI.
- Developer B: After US1 publish path lands, Phase 4 (US2) registration APIs + fighter UI.
- Developer C: After US2 lands, Phase 5 (US3) staff registration.
- Developer D: After US1+US2 land, Phase 6–7 (US4–US5) schedule APIs + board UI.
- Developer E: Phase 8 (US6) summary UI once registrations exist.

---

## Notes

- Map openapi paths to Next.js Route Handlers under `apps/web/src/app/api/**` (e.g. `POST /events` → `api/events/route.ts`).
- Spec term **event organizer** maps to E1 operational role key **`organizer`**; per-event ownership is `event.organizer_user_id` (research.md §1).
- **No `format_key` on `event`** — mixed-format tournaments defer structured fight types to E4; use `description` for human-readable scope in v1 (data-model.md §1.2).
- Fighter registration **must not** require team membership or captain approval (FR-004, FR-005).
- `event_registration.id` and `schedule_entry.id` must remain stable for E4 attachment (FR-016).
- Registration and schedule identifiers are UUIDs; do not reuse rows across withdraw/re-register — insert new registration rows per data-model partial unique constraint semantics.
