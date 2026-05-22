# Implementation Plan: Teams & Rosters (Epic E2)

**Branch**: `002-teams-rosters` | **Date**: 2026-05-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-teams-rosters/spec.md`

**Note**: Executable work will be tracked in `tasks.md` (from `/speckit-tasks`). This plan covers **Phase 0–1** design; implementation phases below align with expected task breakdown.

## Summary

Epic E2 introduces **teams**, **team-scoped captains**, and **membership** with captain **approval** for **fighters** and **squires**, while **marshals** and **FAC administrators** remain **team-agnostic**. E1’s open fighter registration stays, but fighters are **unaffiliated** until an **active** roster membership exists—addressing the gap where any registered fighter was implicitly competition-ready.

Technical approach: extend the existing **Next.js + PostgreSQL + Drizzle** app with new domain tables (`team`, `team_captain_assignment`, `team_membership`), a **team permission layer** alongside E1 operational RBAC, extended **audit events**, and Route Handler APIs per [contracts/openapi.yaml](./contracts/openapi.yaml). Stable `team_membership.id` values prepare **future event registration by role** without implementing events in this epic.

Rationale: [research.md](./research.md). Entities: [data-model.md](./data-model.md).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 20 LTS

**Primary Dependencies**: Next.js (App Router), React, Auth.js v5, Drizzle ORM, Zod (unchanged from E1)

**Storage**: PostgreSQL 16+ — new tables `team`, `team_captain_assignment`, `team_membership`; extend audit `event_type` vocabulary; no change to Auth.js session tables

**Testing**: Vitest (membership state machine, permission matrix, last-captain guard); Playwright (apply → approve, cross-team denial, marshal without team, roster removal history)

**Target Platform**: Web (same deployable as E1)

**Project Type**: Web application — extend `apps/web`

**Performance Goals**: No new SLA in spec; roster lists expected &lt; 100 members per team in v1 — simple indexed queries suffice

**Constraints**: Reuse E1 audit append-only pattern; **no** event registration tables (FR-012 is forward-looking only); **single active fighter affiliation** per user in v1; captain **cannot** self-approve; public team/roster endpoints **feature-flagged** off by default; WCAG 2.1 AA on new primary flows per spec

**Scale/Scope**: Same nonprofit scale as E1; five user stories; **18** authenticated HTTP paths + **2** optional public paths in [contracts/openapi.yaml](./contracts/openapi.yaml) (admin **end** + decide split per FR-007); 4 UI surfaces (fighter apply/affiliation **with team roster for active members**, captain queue/roster, admin teams)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Aligned with `.specify/memory/constitution.md`:

- **Readability**: [data-model.md](./data-model.md) separates global operational roles (E1) from team-scoped captains and memberships; [contracts/openapi.yaml](./contracts/openapi.yaml) groups admin, captain, fighter, and optional public paths.
- **Reusability**: Single `src/lib/teams/` module (permissions, membership service, audit helpers, projections) consumed by all routes—no duplicated approve/reject logic in handlers.
- **User experience**: Spec stories cover unaffiliated state, pending queue, confirmations on reject/remove, and marshal path without forced team join (SC-005).

**Post–Phase 1 re-check**: Design artifacts trace FR-001–FR-014 to schema and HTTP operations; E1 identifiers and audit patterns preserved; no constitution violations requiring Complexity Tracking.

## Delivery phases (preview for tasks.md)

| Phase | Scope |
|-------|--------|
| **1 — Schema** | Migrations for `team`, `team_captain_assignment`, `team_membership`; enums; partial unique indexes; Drizzle schema in `apps/web/src/lib/db/schema.ts`. |
| **2 — Domain lib** | `src/lib/teams/permissions.ts`, `membership-service.ts`, `affiliation-summary.ts`, audit writers; extend RBAC entry points. |
| **3 — US1** | FAC admin team CRUD + captain assign/revoke + admin UI. |
| **4 — US2** | Fighter apply, captain approve/reject, affiliation summary, unaffiliated UX. |
| **5 — US3** | Squire apply path (shared service, `member_kind` branch). |
| **6 — US4** | End membership (captain + admin routes), history queries, admin decide (pending overrides only). |
| **7 — US5** | Permission regression: marshal/FAC admin without team; hybrid user matrix tests. |
| **8 — Polish** | Optional public roster flag, docs, Playwright/Vitest evidence for SC-001–SC-005. |

### Phase alignment (`plan.md` ↔ `tasks.md`)

`tasks.md` uses **Phase 1–8** numbering (Setup → Polish). The delivery table above uses **implementation slice** names. Mapping:

| Plan delivery slice | `tasks.md` phase | Primary tasks |
|---------------------|------------------|---------------|
| — Setup / contracts | **Phase 1** | T001–T003 |
| 1 — Schema + 2 — Domain lib | **Phase 2** (Foundational) | T004–T010 |
| 3 — US1 | **Phase 3** | T011–T020, T018a |
| 4 — US2 | **Phase 4** | T021–T030b, T026b |
| 5 — US3 | **Phase 5** | T031–T035 |
| 6 — US4 | **Phase 6** | T036–T042, T037a, T041a |
| 7 — US5 | **Phase 7** | T043–T046 |
| 8 — Polish | **Phase 8** | T047–T056 |

## Project Structure

### Documentation (this feature)

```text
specs/002-teams-rosters/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── openapi.yaml
├── spec.md
└── tasks.md             # Complete (from `/speckit-tasks`)
```

### Source Code (extends E1)

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── me/team-affiliation/          # fighter/squire status + active team roster
│   │   │   ├── captain/teams/[teamId]/       # pending + roster
│   │   │   └── admin/teams/                  # team CRUD, captains
│   │   ├── (public)/teams/[teamId]/          # optional public roster
│   │   └── api/
│   │       ├── admin/teams/...               # roster, history, memberships/end, decide
│   │       ├── captain/teams/...
│   │       ├── me/team-affiliation/
│   │       ├── me/teams/[teamId]/roster/     # active members for affiliated user
│   │       ├── me/team-memberships/apply/
│   │       └── public/teams/...
│   └── lib/
│       └── teams/
│           ├── permissions.ts
│           ├── membership-service.ts
│           ├── affiliation-summary.ts
│           └── audit.ts
├── tests/
│   ├── unit/teams/
│   └── integration/teams/
└── e2e/teams-roster.spec.ts
```

**Structure Decision**: Stay in **one Next.js app** (E1 decision unchanged). Team domain isolated under `src/lib/teams/` for readability and future extraction if event module references memberships.

## Complexity Tracking

No constitution violations requiring justification.

## Phase 0 & Phase 1 outputs (complete)

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | Complete — no NEEDS CLARIFICATION remain |
| Data model | [data-model.md](./data-model.md) | Complete |
| API contract | [contracts/openapi.yaml](./contracts/openapi.yaml) | Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete |

**Phase 2+**: [tasks.md](./tasks.md) generated; implementation may proceed via `/speckit-implement`.
