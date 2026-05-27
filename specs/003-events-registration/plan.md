# Implementation Plan: Events & Registration (Epic E3)

**Branch**: `003-events-registration` | **Date**: 2026-05-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-events-registration/spec.md`

**Note**: Executable work will be tracked in `tasks.md` (from `/speckit-tasks`). This plan covers **Phase 0–1** design; implementation phases below align with expected task breakdown.

## Summary

Epic E3 introduces **sanctioned events**, **fighter-driven self-registration** (no team captain approval), **staff role registrations** (marshal), a **planned schedule board** with **change history**, and **per-event organizer** ownership atop the global E1 **`organizer`** operational role. Match lifecycle, results, and standings remain deferred (E4–E5).

Technical approach: extend the existing **Next.js + PostgreSQL + Drizzle** app with domain tables (`event`, `event_registration`, `schedule_entry`, `schedule_change_record`), an **`src/lib/events/`** permission and service layer, extended **audit events**, Route Handler APIs per [contracts/openapi.yaml](./contracts/openapi.yaml), and UI surfaces for organizers, fighters, marshals, and FAC admins.

Rationale: [research.md](./research.md). Entities: [data-model.md](./data-model.md).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 20 LTS

**Primary Dependencies**: Next.js (App Router), React, Auth.js v5, Drizzle ORM, Zod, timezone library (**`luxon`**)

**Storage**: PostgreSQL 16+ — new tables `event`, `event_registration`, `schedule_entry`, `schedule_change_record`; extend audit `event_type` vocabulary; no change to Auth.js session tables

**Testing**: Vitest (registration/capacity/waitlist, permission matrix, schedule change log, organizer reassignment); Playwright (SC-004 publish → register → schedule path, a11y on primary flows)

**Target Platform**: Web (same deployable as E1/E2 — `apps/web`)

**Project Type**: Web application — extend `apps/web`

**Performance Goals**: No new SLA in spec; event lists and registration summaries expected &lt; 500 fighters per event in v1 — indexed queries on `event_id`, `lifecycle_status`, `starts_at`

**Constraints**: Reuse E1 audit append-only pattern and E2 affiliation snapshot read helpers; **no** match/result/bracket tables; fighter registration **must not** require team membership; WCAG 2.1 AA on creation, registration, schedule board, and organizer summary per spec; optional public event read behind `PUBLIC_EVENTS` flag (default off)

### Time handling policy (Luxon)

- **Store instants in UTC**: Persist event datetimes, registration windows, and schedule entry times as **UTC** (`timestamptz`).
- **Persist event timezone explicitly**: Store `event.timezone` as an **IANA timezone** string (default **`America/New_York`**).
- **Interpret organizer input in event timezone**: When an organizer enters a local date/time, parse it **in `event.timezone`**, convert to UTC, and store.
- **Render in event timezone**: Display schedule times, registration windows, and deadlines in the **event’s timezone** (not viewer local), including visible timezone text.

**Scale/Scope**: Six user stories; **22** authenticated HTTP operations + **2** optional public paths in [contracts/openapi.yaml](./contracts/openapi.yaml); ~6 UI route groups (organizer events, fighter discovery/register, marshal staff register, schedule board, admin sanction/reassign, registration summary)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Aligned with `.specify/memory/constitution.md`:

- **Readability**: [data-model.md](./data-model.md) separates global `organizer` role from `event.organizer_user_id`; [contracts/openapi.yaml](./contracts/openapi.yaml) groups events, registration, schedule, and admin paths.
- **Reusability**: Single `src/lib/events/` module (`permissions.ts`, `registration-service.ts`, `schedule-service.ts`, `event-service.ts`, audit helpers) — shared capacity/waitlist and withdraw logic for self-serve and on-behalf flows.
- **User experience**: Spec stories cover unaffiliated fighter registration, waitlist, empty schedule state, timezone-visible times, keyboard/a11y expectations, and organizer vs cross-organizer denial (SC-001–SC-005).

**Post–Phase 1 re-check**: Design artifacts trace FR-001–FR-016 to schema and HTTP operations; stable UUIDs on registrations and schedule entries for E4; no constitution violations requiring Complexity Tracking.

## Delivery phases (preview for tasks.md)

| Phase | Scope |
|-------|--------|
| **1 — Schema** | Migrations for `event`, `event_registration`, `schedule_entry`, `schedule_change_record`; enums; partial unique indexes; Drizzle schema in `apps/web/src/lib/db/schema.ts`. |
| **2 — Domain lib** | `src/lib/events/permissions.ts`, `event-service.ts`, `registration-service.ts`, `schedule-service.ts`, audit writers; affiliation snapshot helper (reads E2 active membership). |
| **3 — US1** | Event CRUD draft/publish/cancel; organizer ownership; FAC sanction + organizer reassignment; organizer/admin UI. |
| **4 — US2** | Fighter self-registration, withdraw, capacity/waitlist (FIFO in v1), duplicate guard, unaffiliated path. |
| **5 — US3** | Staff registration (marshal), coexistence with fighter registration, organizer-as-participant. |
| **6 — US4** | Schedule entry CRUD, participant read model, overlap warnings, empty-state UX. |
| **7 — US5** | Schedule change log table + history API; delayed/cancelled status on entries. |
| **8 — US6** | Registration summary, organizer/admin withdraw, on-behalf fighter register. |
| **9 — Polish** | Optional `PUBLIC_EVENTS`, demo seed, Vitest/Playwright evidence for SC-001–SC-005, quickstart validation. |

Waitlist policy: implement a `WaitlistPromotionPolicy` (default FIFO) consumed by `registration-service.ts`; store no policy configuration in v1.

## Project Structure

### Documentation (this feature)

```text
specs/003-events-registration/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── openapi.yaml
├── spec.md
└── tasks.md             # From `/speckit-tasks`
```

### Source Code (extends E1/E2)

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── events/                         # list + detail (fighters)
│   │   │   ├── organizer/events/               # create, edit, publish
│   │   │   ├── organizer/events/[eventId]/
│   │   │   │   ├── registrations/            # summary (US6)
│   │   │   │   └── schedule/                 # board + edit (US4–5)
│   │   │   └── admin/events/                 # sanction, reassign
│   │   ├── (public)/events/[eventId]/        # optional public metadata
│   │   └── api/
│   │       ├── events/...
│   │       ├── admin/events/...
│   │       └── public/events/...
│   └── lib/
│       └── events/
│           ├── permissions.ts
│           ├── event-service.ts
│           ├── registration-service.ts
│           ├── schedule-service.ts
│           ├── affiliation-snapshot.ts
│           └── audit.ts
├── tests/
│   ├── unit/events/
│   └── integration/events/
└── e2e/events-registration.spec.ts
```

**Structure Decision**: Stay in **one Next.js app** (E1/E2 unchanged). Event domain isolated under `src/lib/events/` for readability and E4 match module consumption.

## Complexity Tracking

No constitution violations requiring justification.

## Phase 0 & Phase 1 outputs (complete)

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | Complete — no NEEDS CLARIFICATION remain |
| Data model | [data-model.md](./data-model.md) | Complete |
| API contract | [contracts/openapi.yaml](./contracts/openapi.yaml) | Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete |

**Phase 2+**: Run `/speckit-tasks` to generate [tasks.md](./tasks.md); implementation via `/speckit-implement`.
