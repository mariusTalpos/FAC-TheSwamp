# Implementation Plan: UI Shared Layer (Epic 004)

**Branch**: `004-ui-shared-layer` | **Date**: 2026-05-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-ui-shared-layer/spec.md`

**Note**: Executable work will be tracked in `tasks.md` (from `/speckit-tasks`). This plan covers **Phase 0–1** design; implementation phases below align with expected task breakdown.

## Summary

Epic 004 reduces **duplicated UI code** across authenticated screens after E1–E3: consolidate browser `fetch`/error handling into a shared API client, introduce reusable presentation components and a resource hook, and adopt **server-first** data loading for read-heavy routes—**without** changing business rules, HTTP API contracts, or authorization.

Technical approach: extend `apps/web` with `src/lib/api/client.ts`, `src/hooks/use-api-resource.ts`, `src/components/ui/*`, thin `src/lib/ui/server-loaders/*`, and phased migration of `app/(auth)/**` pages per [contracts/migration-checklist.md](./contracts/migration-checklist.md). Rationale: [research.md](./research.md). Presentation entities: [data-model.md](./data-model.md).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 20 LTS

**Primary Dependencies**: Next.js 15 (App Router), React 19, Auth.js v5, existing domain libs (`src/lib/events`, `src/lib/teams`, `src/lib/auth`); **no** new UI framework or cache library in v1

**Storage**: N/A (no schema changes)

**Testing**: Vitest — `tests/unit/api/client.test.ts`, `tests/unit/hooks/use-api-resource.test.ts`, optional server-loader test; existing `lib/events` and `lib/teams` suites must pass unchanged

**Target Platform**: Web — `apps/web` (same deployable as E1–E3)

**Project Type**: Web application — presentation refactor only

**Performance Goals**: No new SLA; server-first lists remove client waterfall on first paint; avoid duplicate parallel fetches after mutations (single `reload`)

**Constraints**: Reuse existing `ProblemJson` (`{ code, message }`); consume domain `export type` DTOs; FR-007 frozen API surface; WCAG 2.1 AA on `ProblemAlert` and `StatusBadge`; incremental Phases A→B→C; grep/CI guard for legacy `setError(typeof data.message` pattern (SC-001)

**Scale/Scope**: Five user stories; **20** in-scope `app/(auth)` pages + **4** documented exceptions; **7** Phase A event routes (100% coverage gate); ~6 new UI primitives + 1 hook + 1 client module

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Aligned with `.specify/memory/constitution.md`:

- **Readability**: [data-model.md](./data-model.md) names presentation entities; [contracts/ui-modules.md](./contracts/ui-modules.md) lists module paths and signatures; server loaders wrap existing services (no SQL in pages).
- **Reusability**: Single HTTP client, one resource hook, shared list/status/alert components; migration checklist tracks duplication removal (Principle II—explicit remediation post-E3).
- **User experience**: Spec US1–US4 cover consistent errors, shared lists, loading behavior, server-first paint; quickstart maps SC-001–SC-005 to verifiable steps.

**Post–Phase 1 re-check**: Design traces FR-001–FR-010 to concrete files; no API or RBAC changes; Complexity Tracking empty—no justified violations.

## FR traceability

| Requirement | Design artifact / module |
|-------------|-------------------------|
| FR-001 | `src/lib/api/client.ts` |
| FR-002 | Migration checklist + phase gates |
| FR-003 | `src/hooks/use-api-resource.ts` |
| FR-004 | `src/components/ui/*` |
| FR-005 | `EventListRow` + event route migration (Phase A) |
| FR-006 | `src/lib/ui/server-loaders/*` + async pages |
| FR-007 | No changes under `app/api/**` contracts |
| FR-008 | Props typed from existing `contracts.ts` |
| FR-009 | [contracts/migration-checklist.md](./contracts/migration-checklist.md) |
| FR-010 | Vitest files listed in [contracts/ui-modules.md](./contracts/ui-modules.md) §6 |

## Delivery phases (preview for tasks.md)

| Phase | Scope | User stories |
|-------|--------|--------------|
| **0 — Foundation** | `client.ts`, `parseProblemMessage`, unit tests; `ProblemAlert`, `SuccessMessage` | US1 |
| **1 — Primitives** | `StatusBadge`, label maps, `EmptyState`, `EntityList`, `EventListRow` | US2 |
| **2 — Phase A events** | Migrate all event routes; server-first fighter list/detail; organizer list hook; admin event page; LOC baseline + grep gate | US2, US4, US5 (A) |
| **3 — Phase B teams** | `team-affiliation`, captain roster/pending; team label maps | US2, US3, US5 (B) |
| **4 — Phase C admin** | Admin users/teams/overview/detail, fighter-profile, audit page | US1–US3, US5 (C) |
| **5 — Polish** | Optional `lint:ui-duplication` script, a11y spot-check, quickstart evidence, SC-003 manual script | All |

**Implementation order** (spec product note): FR-001 → FR-004 → FR-005 (events) → FR-003/FR-006 → Phase B → Phase C.

## Project Structure

### Documentation (this feature)

```text
specs/004-ui-shared-layer/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1 (presentation layer)
├── quickstart.md        # Phase 1
├── contracts/
│   ├── ui-modules.md
│   └── migration-checklist.md
├── spec.md
└── tasks.md             # From `/speckit-tasks`
```

### Source Code (extends E1–E3)

```text
apps/web/
├── src/
│   ├── lib/
│   │   ├── api/
│   │   │   ├── problem-json.ts       # existing
│   │   │   └── client.ts             # new (FR-001)
│   │   ├── ui/
│   │   │   ├── server-loaders/       # new (FR-006)
│   │   │   └── labels/               # new (StatusBadge maps)
│   │   ├── events/                     # unchanged domain
│   │   └── teams/
│   ├── hooks/
│   │   └── use-api-resource.ts       # new (FR-003)
│   ├── components/
│   │   ├── session-provider.tsx      # existing
│   │   └── ui/                       # new (FR-004)
│   └── app/
│       └── (auth)/
│           ├── events/               # Phase A
│           ├── organizer/events/     # Phase A
│           ├── admin/events/         # Phase A
│           ├── me/                   # Phase B/C
│           ├── captain/              # Phase B
│           └── admin/                # Phase C
└── tests/
    └── unit/
        ├── api/client.test.ts
        └── hooks/use-api-resource.test.ts
```

**Structure Decision**: Stay in **one Next.js app**. Presentation shared layer is isolated under `src/lib/api`, `src/hooks`, `src/components/ui`, and `src/lib/ui` so domain modules remain the authority for business rules.

## Complexity Tracking

No constitution violations requiring justification.

## Phase 0 & Phase 1 outputs (complete)

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | Complete — no NEEDS CLARIFICATION remain |
| Data model | [data-model.md](./data-model.md) | Complete (presentation layer) |
| UI contracts | [contracts/ui-modules.md](./contracts/ui-modules.md) | Complete |
| Migration checklist | [contracts/migration-checklist.md](./contracts/migration-checklist.md) | Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete |

**Phase 2+**: Run `/speckit-tasks` to generate [tasks.md](./tasks.md); implementation via `/speckit-implement`.
