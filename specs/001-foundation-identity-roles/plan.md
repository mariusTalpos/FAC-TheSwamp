# Implementation Plan: Foundation — Identity, Roles & Audit

**Branch**: `001-foundation-identity-roles` | **Date**: 2026-05-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-foundation-identity-roles/spec.md`

**Note**: Executable work is tracked in [tasks.md](./tasks.md) (from `/speckit-tasks`). This plan was **refreshed** after spec/contract updates: **password reset completion** (`POST /auth/reset-password`), **admin provisioning** (`AdminProvisionUserRequest`: `direct_active` | `email_invitation`), **account deactivation** (`POST /admin/users/{userId}/deactivate`), **SC-001** / **SC-004** evidence wording, and **FR-002** / **FR-007** clarifications. Design artifacts: [research.md](./research.md), [data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml), [quickstart.md](./quickstart.md).

## Summary

Epic E1 establishes **fighter self-registration** (adults-only attestation), **sign-in/session**, **password recovery** (forgot + **reset completion** with time-limited proof per FR-002), a **fighter profile** with **public discovery** and **per-field visibility**, **FAC-admin-only operational roles** (with confirmations for destructive actions), **hybrid fighter/staff** users, **FAC-admin read of another user’s full fighter profile** (FR-005), and an **append-only audit trail** for role changes, **denied privilege attempts** where APIs expose role mutation, visibility changes, and account lifecycle actions (**including deactivation**).

Implementation approach: a **TypeScript Next.js** web application backed by **PostgreSQL** and **Drizzle ORM**, **Auth.js v5** with **database-backed sessions**, **application-level RBAC**, **Vitest + Playwright** for automated evidence (SC-002, SC-003, registration + **reset completion** smoke, optional SC-001 task-run artifact), and a committed **accessibility verification** artifact per [spec.md](./spec.md) Verification expectations.

Rationale and alternatives: [research.md](./research.md). Entities and rules: [data-model.md](./data-model.md). HTTP semantics: [contracts/openapi.yaml](./contracts/openapi.yaml).

## Delivery phases (canonical with [tasks.md](./tasks.md))

| Phase | Scope |
|-------|--------|
| **1 — Setup** | Repo scaffold, workspace, Next.js app shell, Postgres locally, env template. |
| **2 — Foundational** | Schema, migrations, Auth.js + DB sessions, append-only audit helper, shared API errors (blocks all user stories). |
| **3 — US1** | Fighter registration, sign-in/out, forgot + **reset completion** routes, recovery email + token persistence. |
| **4 — US2** | Minimum profile policy, visibility, public + owner APIs, public fighter page. |
| **5 — US3** | FAC-admin RBAC, **provision user** (`direct_active` / `email_invitation`), roles, **deactivate**, admin full fighter profile read. |
| **6 — US4** | Audit query API and admin audit UI. |
| **7 — Polish** | Docs, security notes, automated tests, constitution consolidation pass, accessibility evidence. |

Research and schema modeling are captured in [research.md](./research.md) (Phase 0) and [data-model.md](./data-model.md) / [quickstart.md](./quickstart.md) (Phase 1). The table above matches **implementation** sequencing in [tasks.md](./tasks.md).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 20 LTS

**Primary Dependencies**: Next.js (App Router), React, Auth.js v5, Drizzle ORM, Zod (request validation)

**Storage**: PostgreSQL 16+ (users, profiles, role assignments, audit events, session tables, Auth.js adapter tables including tokens for verification and **password reset**)

**Testing**: Vitest (unit/integration); Playwright (e2e: registration, sign-in, forgot-password + **reset-password completion**, public visibility, **admin role denial + audit row**, SC-003-style toggles); optional **@axe-core/playwright** (or equivalent) for primary-flow accessibility checks per spec

**Target Platform**: Web (modern desktop and mobile browsers); Linux-compatible hosting

**Project Type**: Web application (UI + Route Handler APIs in one deployable; split API only if non-functional requirements demand)

**Performance Goals**: No user-facing SLA in [spec.md](./spec.md). Profile engineering may profile hot paths; any hard latency budget should be introduced via **spec amendment**, not only this plan.

**Constraints**: No document vault or automated merge (FR-011); no minor/guardian data (FR-012); last FAC admin protection (FR-013); append-only audit (no app-level UPDATE/DELETE on `audit_event`); **no administrator impersonation** in v1 (spec Out of scope); **WCAG 2.1 Level AA** expectations for primary flows unless FAC approves a documented exception (spec); HTTP contracts must include **reset completion**, **admin provision request body**, and **deactivate** (see [contracts/openapi.yaml](./contracts/openapi.yaml))

**Scale/Scope**: Single-organization nonprofit; order of **10³–10⁴** users initially; four user stories plus admin audit read path, **admin full fighter profile read**, and verification deliverables

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Aligned with `.specify/memory/constitution.md` (FAC-App: readability, reusability, user experience):

- **Readability**: [data-model.md](./data-model.md) names entities and invariants; [contracts/openapi.yaml](./contracts/openapi.yaml) documents HTTP operations (including `POST /auth/reset-password`, `POST /admin/users` with `AdminProvisionUserRequest`, `POST /admin/users/{userId}/deactivate`, and `GET /admin/users/{userId}/fighter-profile`); [research.md](./research.md) records stack decisions without tribal knowledge.
- **Reusability**: Auth, RBAC checks, audit writer, **profile projection** (public vs owner vs **FAC-admin full view**), and shared API error mapping are single implementations under `src/lib/*`, not duplicated per route ([tasks.md](./tasks.md) T060).
- **User experience**: [spec.md](./spec.md) user stories, acceptance scenarios, edge cases, **Accessibility expectations**, **destructive-action confirmations**, **Verification expectations**, and SC-001–SC-005 — implementation must preserve them in UI copy, confirmations, and automated or documented manual verification.

**Post–Phase 1 re-check**: Design artifacts give traceability from FR-* to contracts and schema, including admin private profile read, **password reset completion**, **admin provision modes**, **deactivation**, and denial audit semantics; no constitution violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation-identity-roles/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── openapi.yaml
├── checklists/
├── spec.md
└── tasks.md             # From /speckit-tasks (not produced by /speckit-plan)
```

### Source Code (repository root)

*Proposed layout when implementation is added (greenfield today):*

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── (public)/            # register, login, reset-password, public fighter page
│   │   ├── (auth)/              # me, fighter profile editor, admin users/audit/profile
│   │   └── api/                 # Route Handlers: auth (register, forgot, reset), me, public, admin
│   ├── lib/
│   │   ├── auth/
│   │   ├── db/
│   │   ├── rbac/               # require-fac-admin, last-fac-admin guard
│   │   ├── audit/              # append-only writer + list for user
│   │   ├── profile/            # minimum policy, visibility, public + admin full projection
│   │   ├── admin/              # provision-user (direct_active / email_invitation)
│   │   ├── api/                # shared problem+json mapping
│   │   └── email/
│   └── components/
├── tests/
│   ├── unit/
│   └── integration/
├── e2e/                        # Playwright (+ optional axe)
├── docs/
│   ├── security-hardening.md   # T057
│   └── accessibility-verification.md  # T062 / spec Verification expectations
└── drizzle/

packages/
└── shared/                     # Optional if monorepo grows
```

**Structure Decision**: **One Next.js app** so public SSR, authenticated surfaces, and admin tools share auth, RBAC, audit, and profile utilities ([research.md](./research.md) section 1). Domain logic stays in `src/lib/*` so extraction to `packages/` stays mechanical if the repo adopts a monorepo tool.

## Complexity Tracking

No constitution violations requiring justification for this epic’s chosen shape.
