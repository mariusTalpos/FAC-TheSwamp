# Phase 0 — Research: Foundation — Identity, Roles & Audit

This repository is **greenfield** (no `package.json` or runtime code yet). The following decisions establish a coherent baseline for Epic E1 implementation.

## 1. Application shape and runtime

**Decision**: Ship FAC-App as a **single TypeScript web application** using **Next.js** (App Router) with **Route Handlers** for HTTP APIs and **React Server Components** where they simplify public and authenticated reads.

**Rationale**: The spec requires anonymous **public fighter pages**, authenticated fighter flows, and **FAC-admin-only** provisioning and audit review. One deployable unit keeps volunteer operations simple; Next.js matches SSR/SEO expectations for public profiles without a separate BFF in v1.

**Alternatives considered**:

- **Separate SPA + REST API**: Clear boundaries but two deployables and more glue for auth cookies/CORS in early phase.
- **Server-only (HTMX + templating)**: Fewer moving parts but weaker ecosystem for complex forms, accessibility testing, and future mobile clients.

## 2. Data store and persistence

**Decision**: **PostgreSQL** as the system of record; schema access via **Drizzle ORM** (TypeScript-first migrations and types).

**Rationale**: Relational model fits users, role assignments, profile fields, and **append-only audit** with transactional guarantees. Drizzle aligns with readability (explicit schemas in code) and testability.

**Alternatives considered**:

- **Prisma**: Strong DX; slightly heavier runtime and migration workflow for small teams—either is acceptable; Drizzle chosen for SQL-adjacent clarity and lightweight footprint.
- **Document DB**: Poor fit for relational integrity (roles, uniqueness, audit queries).

## 3. Authentication and session

**Decision**: **Auth.js (v5)** with the **Credentials** provider for email+password, **session strategy JWT or database sessions** (prefer **database sessions** stored in PostgreSQL for instant revocation aligned with “revoked role while signed in”), plus **email verification** and **password reset** via transactional email. **Reset completion** is exposed as a first-class HTTP operation in [contracts/openapi.yaml](./contracts/openapi.yaml) (`POST /auth/reset-password`): caller submits the **opaque single-use token** from the email (or link query normalized server-side) plus a **new password**; invalid or expired tokens return a generic **400** without distinguishing existence of accounts. **Forgot** (`POST /auth/forgot-password`) remains **202** with **no enumeration**. Tokens map to Auth.js adapter storage (e.g. `VerificationToken`) or an equivalent table with **short TTL** and **one-time use** after successful reset.

**Rationale**: Mature Next.js integration, explicit providers, and community patterns for secure cookies. FR-002 now explicitly requires both recovery request and reset completion; contract and implementation stay aligned and testable (Playwright can drive the full path).

**Alternatives considered**:

- **Better Auth**: Strong fit for self-hosted auth; acceptable swap if the team standardizes later—plan artifacts (data model, contracts) remain valid if table names differ.
- **External IdP only (Auth0, Clerk)**: Adds cost and vendor coupling for a free platform; can be layered later without changing domain model concepts.

## 4. Authorization model

**Decision**: **Application-enforced RBAC**: operational roles as rows in a **role assignment** table; **FAC administrator** is a controlled role in the same model. Fighter capability is derived from **presence of a fighter profile** linked to the account, not from self-assigned “fighter role” elevation.

**Rationale**: Matches FR-006–FR-010 and Story 3: only FAC admins mutate privileged roles; fighters default to least privilege at registration.

**Alternatives considered**:

- **RBAC in external policy engine (OPA)**: Overkill for v1 user counts; revisit if many services share policies.

## 5. Audit trail

**Decision**: **Append-only `audit_event` table** (no updates/deletes from app code); each row stores event type, actor user id, target user id (nullable), structured **before/after payload** (JSON), and timestamp. Sensitive reads for SC-004 via **admin-only API** with pagination.

**Rationale**: Satisfies FR-009 and Story 4; JSON payload keeps schema evolvable as FAC adds fields.

**Alternatives considered**:

- **Event sourcing entire domain**: Too heavy for v1; append-only audit is sufficient for investigations.

## 6. Testing

**Decision**: **Vitest** for unit and integration tests (DB via testcontainers or docker-compose Postgres in CI); **Playwright** for critical journeys (registration, sign-in, **forgot-password plus reset-password completion**, public page visibility, **admin provision** smoke for `direct_active` / `email_invitation` as implemented, **admin role self-grant or API denial returning 403 with an audit row** per SC-002, **visibility toggles vs anonymous read** per SC-003). **Accessibility**: primary flows covered by Playwright + **axe-core** (or a **dated manual checklist** committed to the repo) to satisfy [spec.md](./spec.md) Verification expectations and WCAG 2.1 AA bar.

**Rationale**: Maps to measurable SC-001–SC-004, denial auditing, and constitution “Quality & Evidence” traceability.

**Alternatives considered**:

- **Jest**: Fine; Vitest is faster and defaults align with Vite/Next tooling.

## 7. Hosting and operations (non-binding)

**Decision**: Target **Linux** containers or managed Node hosting (e.g. Fly.io, Railway, Render) with managed PostgreSQL—**exact provider left to deployment spec**.

**Rationale**: Platform doc stays product-level; implementation needs a placeholder for CI/CD and secrets.

**Alternatives considered**: Fixed vendor in plan would be NEEDS CLARIFICATION without FAC ops input—deferred to deployment checklist in `quickstart.md`.
