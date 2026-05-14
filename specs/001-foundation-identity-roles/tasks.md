---
description: "Implementation tasks for Foundation — Identity, Roles & Audit (Epic E1)"
---

# Tasks: Foundation — Identity, Roles & Audit

**Input**: Design documents from `/specs/001-foundation-identity-roles/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml), [research.md](./research.md), [quickstart.md](./quickstart.md)

**Tests**: Automated and/or documented manual verification is **required** for release evidence per [spec.md](./spec.md) Verification expectations and SC-001–SC-004. Vitest/Playwright suites and the accessibility artifact are in **Phase 7** (T058, T062). Critical paths: self-grant denial with audit (SC-002), visibility toggles (SC-003), registration/sign-in + **password reset completion** (FR-002 / SC-001 evidence), **SC-004** scenario checklist, primary-flow accessibility.

**Organization**: Phases follow user story priority (P1–P4) after shared setup and foundational infrastructure.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no dependency on incomplete tasks in the same batch)
- **[USn]**: User story label from [spec.md](./spec.md)
- Paths follow [plan.md](./plan.md) (`apps/web/` Next.js app)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Greenfield scaffold — Node 20, Next.js (App Router), PostgreSQL locally, environment template.

- [ ] T001 Create `pnpm-workspace.yaml` at repository root with `packages: ['apps/*']` for the monorepo layout described in plan.md
- [ ] T002 Create root `package.json` at repository root with workspace scripts (`pnpm dev`, `pnpm -C apps/web …`) delegating to apps/web
- [ ] T003 Scaffold `apps/web/package.json` with Next.js (App Router), React, TypeScript 5 strict, `zod`, `drizzle-orm`, `postgres` or `pg`, Auth.js v5 packages, and `pnpm` scripts `dev`, `build`, `start`, `lint`, `db:generate`, `db:migrate`, `db:studio` per plan.md
- [ ] T004 [P] Add `apps/web/tsconfig.json` with `strict: true` and path alias `@/*` → `./src/*`
- [ ] T005 [P] Add `apps/web/next.config.ts` (or `.mjs`) with project name and any required server external packages for Drizzle/Auth.js
- [ ] T006 [P] Add ESLint flat config in `apps/web/eslint.config.mjs` aligned with Next.js defaults
- [ ] T007 [P] Add Prettier config in `apps/web/.prettierrc` and ignore file `apps/web/.prettierignore`
- [ ] T008 Add `docker-compose.yml` at repository root with PostgreSQL 16+ service and published port for local development per quickstart.md
- [ ] T009 Add `apps/web/.env.example` documenting `DATABASE_URL`, `AUTH_SECRET`, and `EMAIL_*` variables per quickstart.md (no secrets committed)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, migrations, Auth.js with database sessions, append-only audit writer, and shared HTTP helpers. **No user story route work** until this phase completes.

**⚠️ CRITICAL**: User story phases MUST NOT start until this checkpoint passes.

- [ ] T010 Add Drizzle Kit config in `apps/web/drizzle.config.ts` pointing at `src/lib/db/schema.ts` and migrations output folder `apps/web/drizzle/migrations/`
- [ ] T011 Define Drizzle tables in `apps/web/src/lib/db/schema.ts` for `user`, `fighter_profile`, `operational_role`, `role_assignment`, `audit_event` per data-model.md (no minor/guardian columns; `email` uniqueness; enums for `user.status`, `fighter_profile.completion_state`)
- [ ] T012 Add Auth.js adapter schema tables to `apps/web/src/lib/db/schema.ts` after domain tables (e.g. `account`, `session`, `verificationToken`) as library-managed entities per data-model.md section 6
- [ ] T013 Generate and commit initial migration SQL under `apps/web/drizzle/migrations/` from the schema (`pnpm db:generate` workflow documented in apps/web/README.md)
- [ ] T014 Implement `apps/web/src/lib/db/index.ts` exporting a singleton Drizzle client using `DATABASE_URL` from environment
- [ ] T015 Implement operational role seed data in `apps/web/src/lib/db/seeds/operational-roles.ts` and a runnable seed entry (e.g. `apps/web/scripts/seed-operational-roles.ts` or `pnpm db:seed`) loading keys like `fac_admin`, `marshal`, `organizer`, `squire` with `is_privileged` flags per data-model.md
- [ ] T016 Configure Auth.js in `apps/web/src/lib/auth/auth.config.ts` with Credentials provider, secure password hashing, and **database session** strategy per research.md section 3
- [ ] T017 Mount Auth.js HTTP handler in `apps/web/src/app/api/auth/[...nextauth]/route.ts` (or Auth.js v5 equivalent path under `apps/web/src/app/api/`) with adapter wired to Drizzle
- [ ] T018 Add `apps/web/src/lib/auth/session.ts` with typed session helpers for Server Components and Route Handlers (current `user.id`, role keys from session callback)
- [ ] T019 Implement append-only `insertAuditEvent` in `apps/web/src/lib/audit/write-audit-event.ts` writing to `audit_event` with **no** application-level UPDATE/DELETE per data-model.md section 5
- [ ] T020 Add shared JSON error shape and Zod-to-response mapping in `apps/web/src/lib/api/problem-json.ts` matching `components/schemas/ErrorResponse` in contracts/openapi.yaml
- [ ] T021 Add `apps/web/src/middleware.ts` only if required for cookie/session paths (keep minimal; document matcher scope)

**Checkpoint**: Database migrates cleanly; Auth.js session establishes; audit insert helper callable from later phases.

---

## Phase 3: User Story 1 — Fighter self-registration and sign-in (Priority: P1) 🎯 MVP

**Goal**: Adult fighter self-registration with explicit attestation, fighter profile shell, sign-in/sign-out, and full **lost-access recovery** (forgot + **reset completion**) per FR-001, FR-002, FR-006, FR-012 and openapi `/auth/*`.

**Independent Test**: Complete registration for a new email with adult attestation true → receive session or success; sign out and sign in again; forgot-password request returns 202 without enumeration; **complete reset** with valid token and new password then sign in; attest false → refusal with clear adults-only message; no privileged roles self-granted.

- [ ] T022 [US1] Add Zod request bodies in `apps/web/src/lib/auth/contracts.ts` mirroring `FighterRegistrationRequest`, `LoginRequest`, forgot-password payload, and `PasswordResetCompleteRequest` from contracts/openapi.yaml
- [ ] T023 [US1] Implement POST `apps/web/src/app/api/auth/register/fighter/route.ts` mapping openapi `POST /auth/register/fighter`: validate payload, refuse when `adultAttestation` is false (FR-012), create `user` + linked `fighter_profile` shell (incomplete), default **no** operational roles (FR-006), return 201 with body aligned to `AuthSessionResponse` or establish session per product choice
- [ ] T024 [US1] Extend `apps/web/src/lib/auth/auth.config.ts` `authorize` / callbacks to load operational role keys from `role_assignment` for session and to block `user.status = disabled` from signing in; ensure privileged Route Handlers **re-check** current role assignments (or refresh session role claims) so revocation takes effect without leaving stale privileged access, consistent with spec.md edge case on revoked roles
- [ ] T025 [US1] Implement POST `apps/web/src/app/api/auth/logout/route.ts` or use Auth.js signOut from a server action in `apps/web/src/app/(auth)/actions.ts` mapping openapi `POST /auth/logout` (204 semantics)
- [ ] T026 [US1] Implement POST `apps/web/src/app/api/auth/forgot-password/route.ts` returning 202 without email enumeration per openapi `/auth/forgot-password`, **and** POST `apps/web/src/app/api/auth/reset-password/route.ts` per openapi `POST /auth/reset-password` (token + new password, single-use proof, FR-002 completion step)
- [ ] T027 [US1] Add transactional email + token persistence wiring in `apps/web/src/lib/email/mailer.ts` and token tables usage for verification, **password-reset issuance**, and reset completion (SMTP or provider from `EMAIL_*` env) per research.md section 3
- [ ] T028 [US1] Build fighter registration UI in `apps/web/src/app/(public)/register/fighter/page.tsx` with adult attestation checkbox, validation errors, and adults-only refusal copy per spec.md edge cases; meet **Accessibility expectations** (keyboard, labels, errors not color-only)
- [ ] T029 [US1] Build sign-in UI in `apps/web/src/app/(public)/login/page.tsx` using Auth.js sign-in flow with link to forgot-password; meet **Accessibility expectations** (keyboard, labels, errors not color-only)
- [ ] T030 [US1] Build forgot-password UI in `apps/web/src/app/(public)/forgot-password/page.tsx` posting to forgot-password API (202, generic success messaging, no enumeration); meet **Accessibility expectations**
- [ ] T031 [US1] Build reset-password UI in `apps/web/src/app/(public)/reset-password/page.tsx` (token from secure query or server-handled form) posting to reset-password API with generic errors for invalid/expired token per openapi; meet **Accessibility expectations**
- [ ] T032 [US1] Add authenticated landing in `apps/web/src/app/(auth)/me/page.tsx` as the post–sign-in entry point (link to fighter profile editor in later story acceptable as stub link until US2)

**Checkpoint**: New fighter can onboard, recover access, and re-authenticate without staff involvement.

---

## Phase 4: User Story 2 — Fighter profile and public discovery (Priority: P2)

**Goal**: Minimum profile enforcement (FR-003), authenticated full view, public filtered view (FR-004, FR-005), and visibility audit hooks.

**Independent Test**: As authenticated fighter, save required fields until `completion_state` becomes complete; anonymous visitor sees public-by-default and opted-in fields only; hidden optional fields absent for anonymous but visible to self; toggling visibility creates audit entries consumed in US4 read path.

- [ ] T033 [P] [US2] Implement minimum field policy and completion derivation in `apps/web/src/lib/profile/minimum-policy.ts` (configurable list until FAC policy doc; document placeholders per spec.md Dependencies)
- [ ] T034 [P] [US2] Implement visibility map types and merge helpers in `apps/web/src/lib/profile/visibility.ts` aligned with `fighter_profile.visibility` JSONB from data-model.md
- [ ] T035 [US2] Implement GET `apps/web/src/app/api/me/fighter-profile/route.ts` mapping openapi `GET /me/fighter-profile` returning `FighterProfilePrivate` or 404 if no profile
- [ ] T036 [US2] Implement PATCH `apps/web/src/app/api/me/fighter-profile/route.ts` mapping openapi `PATCH /me/fighter-profile`: validate `FighterProfilePatch`, recompute `completion_state`, persist updates
- [ ] T037 [US2] On successful visibility delta in PATCH handler, call `insertAuditEvent` from `apps/web/src/lib/audit/write-audit-event.ts` with event type `profile.visibility_changed` and before/after payload per FR-009
- [ ] T038 [US2] Implement public projection helper in `apps/web/src/lib/profile/public-projection.ts` enforcing minimum public facts when optional fields hidden per spec.md Assumptions
- [ ] T039 [US2] Implement GET `apps/web/src/app/api/public/fighters/[fighterId]/route.ts` mapping openapi `GET /public/fighters/{fighterId}` returning `FighterProfilePublic` or 404 when profile incomplete / unknown per FR-004
- [ ] T040 [US2] Build fighter profile editor UI in `apps/web/src/app/(auth)/me/fighter-profile/page.tsx` showing incomplete indicators (FR-003) and visibility toggles for hideable keys; meet **Accessibility expectations** (keyboard, labels, errors not color-only)
- [ ] T041 [US2] Build public fighter page in `apps/web/src/app/(public)/fighters/[fighterId]/page.tsx` (RSC or client) reading the public API payload for anonymous visitors; meet **Accessibility expectations** for readable public content

**Checkpoint**: Public discovery and per-field visibility behave per acceptance scenarios 2–3 in spec.md.

---

## Phase 5: User Story 3 — FAC admin provisions staff and operational roles (Priority: P3)

**Goal**: FAC-admin-only provisioning (**`direct_active`** / **`email_invitation`** per openapi), role assign/revoke, hybrid users (fighter + roles), denials for non-admins (FR-007, FR-008, FR-010), last-FAC-admin protection (FR-013), audit for role changes and denied privilege attempts (FR-009), account **deactivation**, and **FAC-admin read** of another user’s full fighter profile (FR-005).

**Independent Test**: As FAC admin, provision staff with each **provisionMode**, assign roles to fighter and staff; as non-admin, role mutation returns 403 and audit where applicable; cannot remove last `fac_admin`; deactivate user per openapi; FAC admin can open full fighter profile for another user (T050–T051).

- [ ] T042 [US3] Implement `apps/web/src/lib/rbac/require-fac-admin.ts` resolving `fac_admin` (or configured key) from session/db and throwing/forbidding otherwise (FR-010)
- [ ] T043 [US3] Implement `apps/web/src/lib/rbac/last-fac-admin-guard.ts` with queries against `role_assignment` + `operational_role` to block demote/deactivate that would leave zero FAC admins (FR-013)
- [ ] T044 [US3] Implement admin orchestration in `apps/web/src/lib/admin/provision-user.ts` for **`direct_active`** vs **`email_invitation`** branches from `AdminProvisionUserRequest` (no fighter profile by default unless policy adds one later) per FR-007 / FR-008 and openapi
- [ ] T045 [US3] Implement POST `apps/web/src/app/api/admin/users/route.ts` mapping openapi `POST /admin/users` (Zod-validated `AdminProvisionUserRequest`) guarded by `require-fac-admin`, writing `user.created` audit via `apps/web/src/lib/audit/write-audit-event.ts`
- [ ] T046 [US3] Implement POST `apps/web/src/app/api/admin/users/[userId]/roles/route.ts` mapping openapi role assign: validate `operationalRoleKey`, insert `role_assignment`, audit `role.assigned`, apply last-admin guard on privileged roles; on **403** from non–FAC-admin callers, write `insertAuditEvent` for denied privilege attempt per FR-009 / SC-002
- [ ] T047 [US3] Implement DELETE `apps/web/src/app/api/admin/users/[userId]/roles/route.ts` mapping openapi role revoke with JSON body `operationalRoleKey`, set `valid_to`, audit `role.revoked`, apply last-admin guard (FR-013); on **403** from non–FAC-admin callers, write audit denial per FR-009 / SC-002
- [ ] T048 [US3] Implement user deactivation flow as POST `apps/web/src/app/api/admin/users/[userId]/deactivate/route.ts` mapping openapi `POST /admin/users/{userId}/deactivate`, setting `user.status = disabled`, auditing `user.deactivated`, and respecting last-admin rules where applicable per FR-009; on **403** from non–FAC-admin callers, write audit denial per FR-009 where applicable
- [ ] T049 [US3] Build FAC admin UI in `apps/web/src/app/(auth)/admin/users/page.tsx` for provisioning users (**provisionMode** choice + fields per Zod branch), assigning/revoking roles, and deactivation, with **confirmation steps** for destructive actions (role revoke, account deactivation) per spec.md US3, plus clear denial messaging (FR-010)
- [ ] T050 [US3] Implement GET `apps/web/src/app/api/admin/users/[userId]/fighter-profile/route.ts` mapping openapi `GET /admin/users/{userId}/fighter-profile`, guarded by `require-fac-admin`, returning `FighterProfilePrivate` or 404 per FR-005
- [ ] T051 [US3] Extend admin UI (e.g. user row drill-down or `apps/web/src/app/(auth)/admin/users/[userId]/page.tsx`) to load T050 for fighters and display full profile including hidden-from-public fields (read-only)

**Checkpoint**: Operational roles are staff-provisioned only; self-grant impossible; hybrid and staff-only accounts behave per acceptance scenarios.

---

## Phase 6: User Story 4 — Audit trail for sensitive actions (Priority: P4)

**Goal**: Chronological, paginated admin read of audit entries for a user (SC-004, FR-009) with consistent payloads for role, visibility, and lifecycle events emitted in earlier phases.

**Independent Test**: After role and visibility changes, FAC admin opens audit list for that user and sees ordered events with actor, target, summaries, timestamps.

- [ ] T052 [US4] Implement query layer in `apps/web/src/lib/audit/list-audit-events-for-user.ts` selecting from `audit_event` ordered by `created_at` / `id` with keyset or cursor pagination compatible with `AuditPage` in contracts/openapi.yaml
- [ ] T053 [US4] Implement GET `apps/web/src/app/api/admin/users/[userId]/audit/route.ts` mapping openapi `GET /admin/users/{userId}/audit` with `cursor` and `limit` query params, FAC-admin-only
- [ ] T054 [US4] Build audit timeline UI in `apps/web/src/app/(auth)/admin/users/[userId]/audit/page.tsx` consuming the audit API and showing human-readable payload fields
- [ ] T055 [US4] Add traceability pass: ensure `user.created` from fighter self-registration in T023 writes `insertAuditEvent` in `apps/web/src/app/api/auth/register/fighter/route.ts` if not already done, aligning payload shape with FR-009

**Checkpoint**: Investigators can answer who/when/what for role, visibility, and covered lifecycle events without developer tools.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Security, documentation, constitution alignment, quickstart validation, automated verification (SC-002, SC-003, SC-001 / FR-002 evidence including reset completion, SC-004 checklist), and accessibility evidence.

- [ ] T056 [P] Add `apps/web/README.md` documenting local Postgres, migrations, seeds, env vars, and auth flows (including forgot + reset) mirroring quickstart.md
- [ ] T057 [P] Add rate limiting or abuse-hardening notes and minimal implementation (e.g. middleware or reverse-proxy assumption) in `apps/web/docs/security-hardening.md`
- [ ] T058 [P] Add `apps/web/vitest.config.ts` and `apps/web/playwright.config.ts` and **implement** initial suites (not placeholders only): at minimum (1) **SC-002** — non-admin self-grant / role-API denial returns 403 and creates an audit row with a stable denial event type (e.g. `role.elevation_denied` per data-model.md), (2) **SC-003** — anonymous public payload matches saved visibility for a small scripted set of toggles, (3) smoke on registration + sign-in + **forgot + reset-password completion** aligned with FR-002 / SC-001 evidence scope; (4) **SC-004** — scripted scenario checklist against audit API per spec; (5) optional artifact for **SC-001** moderated or equivalent task-run review per spec Verification expectations
- [ ] T059 Run through manual checklist in `specs/001-foundation-identity-roles/quickstart.md` on a clean clone and fix gaps (scripts, ports, seed order)
- [ ] T060 Constitution pass: scan `apps/web/src/app/api/**` and `apps/web/src/lib/**` for duplicated RBAC/audit logic and consolidate into `apps/web/src/lib/rbac/` and `apps/web/src/lib/audit/` per plan.md modularity goals
- [ ] T061 UX copy pass for FR-012 refusal, FR-013 blocking messages, and disabled-account sign-in errors across `apps/web/src/app/(public)/**` and `apps/web/src/app/(auth)/admin/**`
- [ ] T062 [P] Add an **accessibility verification** artifact for primary flows in spec.md (e.g. Playwright + axe-core, or a dated manual checklist committed under `apps/web/docs/accessibility-verification.md`) satisfying spec Verification expectations

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No prerequisites — start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user stories**.
- **Phases 3–6 (US1–US4)**: Each depends on Phase 2 completion. Sequential priority is P1 → P2 → P3 → P4 for **minimal risk**; US3 and US4 touch audit writes/reads that must stay consistent with prior stories.
- **Phase 7 (Polish)**: Depends on completion of the user stories targeted for the release (minimum US1 for demo; US1–US4 for full epic).

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2. No dependency on other stories.
- **US2 (P2)**: Starts after Phase 2; **practically** validates against US1 registration + session (cannot edit profile without account).
- **US3 (P3)**: Starts after Phase 2; requires seeded `operational_role` and session role loading from Phase 2/US1.
- **US4 (P4)**: Starts after Phase 2; **most valuable** once US2–US3 emit audit events; US4 tasks include backfill/traceability on US1 registration audit.

### User Story Completion Order (for MVP → full epic)

```text
Phase 2 ──► US1 (P1) ──► US2 (P2) ──► US3 (P3) ──► US4 (P4) ──► Polish
```

### Within Each User Story

- Validate with Zod before persisting (contracts alignment).
- Persist domain tables before returning API responses.
- Call `insertAuditEvent` synchronously in the same transaction as mutating writes where feasible.

### Parallel Opportunities

- **Phase 1**: T004–T007 can run in parallel (different config files).
- **Phase 2**: T011 and T012 both touch `apps/web/src/lib/db/schema.ts` — complete in one commit before T013 migration generate.
- **Phase 4**: T033 and T034 can run in parallel (separate modules under `apps/web/src/lib/profile/`).
- **Phase 7**: T056, T057, T058, T062 can run in parallel (different files); T059–T061 may follow or overlap once suites exist.

---

## Parallel Example: User Story 2 (library modules)

```bash
# After T032 complete, parallel library work:
Task: "Implement minimum field policy in apps/web/src/lib/profile/minimum-policy.ts"
Task: "Implement visibility helpers in apps/web/src/lib/profile/visibility.ts"
```

---

## Parallel Example: User Story 1 (UI after API)

```bash
# After T026 APIs stable:
Task: "Build apps/web/src/app/(public)/register/fighter/page.tsx"
Task: "Build apps/web/src/app/(public)/login/page.tsx"
Task: "Build apps/web/src/app/(public)/forgot-password/page.tsx"
Task: "Build apps/web/src/app/(public)/reset-password/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1).
3. **STOP and validate** independent test for US1 (register → sign out → sign in → forgot-password → reset completion → sign in with new password; adults-only refusal).
4. Demo or deploy thin MVP.

### Incremental Delivery

1. Foundation (Phases 1–2) → database + auth + audit writer ready.
2. Add US1 → test → release candidate for onboarding-only slice.
3. Add US2 → test → release with public fighter discovery.
4. Add US3 → test → release with operational governance.
5. Add US4 → test → release with full audit review UX.

### Parallel Team Strategy

- Developer A: Phase 3 (US1) APIs then UI.
- Developer B: After US1 APIs land, Phase 4 (US2) public projection + routes.
- Developer C: After foundation, Phase 5 (US3) admin services (blocked on session role claims from US1 path); includes **T050–T051** admin full-profile read.

---

## Notes

- HTTP paths in openapi.yaml are logical; map to Next.js Route Handlers under `apps/web/src/app/api/**` preserving status codes and schemas (`POST /auth/reset-password`, `POST /admin/users`, `POST /admin/users/{userId}/deactivate`, `GET /admin/users/{userId}/fighter-profile`, etc.).
- FR-011: do not add document vault or automated merge tables; FR-012: no minor/guardian columns (data-model.md).
- Update `FighterProfilePublic` / minimum fields when FAC supplies policy inputs (spec.md Dependencies); track contract drift in `specs/001-foundation-identity-roles/contracts/openapi.yaml`.
