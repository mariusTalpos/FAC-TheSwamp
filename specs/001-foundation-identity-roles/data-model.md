# Data Model: Foundation — Identity, Roles & Audit

Entities derive from [spec.md](./spec.md) Key Entities and functional requirements FR-001–FR-013 (including FR-009 denial events and FR-005 **admin cross-user** full profile read; no impersonation tables in v1).

## 1. `user` (account)

Canonical **sign-in identity** and lifecycle.

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID PK | Stable identifier for foreign keys and audit. |
| `email` | CITEXT or VARCHAR, UNIQUE | Primary contact; FR uniqueness / duplicate policy. |
| `email_verified_at` | TIMESTAMPTZ, nullable | Required before treating contact as trusted for recovery. |
| `password_hash` | TEXT | Never store plaintext; algorithm per auth library defaults (e.g. Argon2). |
| `status` | ENUM: `active`, `disabled` | FR admin deactivation; blocks sign-in when `disabled`. |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Relationships**:

- 0..1 `fighter_profile` (`fighter_profile.user_id` → `user.id`).
- 0..n `role_assignment`.
- 0..n `audit_event` as actor or target.

**Rules**:

- **FR-012**: No columns for minor/guardian in v1 schema.
- **FR-013**: Application constraint: cannot disable last FAC admin or strip last FAC admin role without successor (query counts admin-capable users).

## 2. `fighter_profile`

**Fighter identity** and display data; public visibility per field/group.

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID PK | |
| `user_id` | UUID FK → `user.id`, UNIQUE | One fighter profile per user in v1. |
| `completion_state` | ENUM: `incomplete`, `complete` | Derived from FAC minimum field policy (FR-003); may be cached updated on save. |
| `display_name` | TEXT | Part of minimum public facts (Assumptions). |
| `ring_name` | TEXT, nullable | If FAC policy treats as alternate public label. |
| `visibility` | JSONB | Map of hideable element keys → `{ public: boolean }` or equivalent; FR-005. |
| … | … | **Placeholder**: additional profile columns driven by FAC policy doc (out of band); migrations add columns as policy stabilizes. |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Rules**:

- **FR-004**: Public read surface only when `completion_state = complete` (or stricter gate if spec amended).
- **FR-005**: Server must filter JSON by **viewer context**: anonymous (public projection only), authenticated **owner** (`GET /me/fighter-profile`), authenticated **FAC administrator** viewing **another** user (`GET /admin/users/{userId}/fighter-profile` — same payload class as owner, read-only unless separate edit flows exist). Non–FAC-admin operational roles MUST NOT receive hidden-from-public fields for other users’ profiles in v1.
- Edge case: optional fields hidden → public page still shows policy minimum (Assumptions).

## 3. `operational_role` (reference)

FAC-controlled **role labels** (lookup, not hard-coded strings in assignments only).

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID or SMALLSERIAL PK | |
| `key` | TEXT UNIQUE | Machine key, e.g. `fac_admin`, `marshal`, `organizer`, `squire`. |
| `display_name` | TEXT | Human label. |
| `is_privileged` | BOOLEAN | If true, assignment changes restricted to FAC admin (FR-007, FR-010). |

Seeded by migration from FAC’s controlled list (spec dependency).

## 4. `role_assignment`

Mapping **user** ↔ **operational role**; only FAC admin workflows create/update/delete.

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID PK | |
| `user_id` | UUID FK → `user.id` | |
| `operational_role_id` | FK → `operational_role.id` | |
| `assigned_by_user_id` | UUID FK → `user.id` | FAC admin who performed action. |
| `valid_from` | TIMESTAMPTZ | Default `now()`. |
| `valid_to` | TIMESTAMPTZ, nullable | Soft revocation; null = active. |

**Rules**:

- **FR-007 / FR-010**: Only users with `fac_admin` (or equivalent) may insert/update rows for privileged roles.
- **FR-008**: User may have assignments and optionally no fighter profile.
- Uniqueness: partial unique on (`user_id`, `operational_role_id`) where `valid_to IS NULL` for non-stackable roles if FAC requires; otherwise allow multiples only if policy says so (default: one active row per role per user).

## 5. `audit_event`

**Append-only** log (FR-009).

| Field | Type | Notes |
|-------|------|--------|
| `id` | BIGSERIAL PK | Monotonic ordering aid. |
| `event_type` | TEXT | e.g. `role.assigned`, `role.revoked`, `role.elevation_denied` (or stable equivalent for **403** privilege attempts per FR-009), `profile.visibility_changed`, `user.created`, `user.deactivated`. |
| `actor_user_id` | UUID FK, nullable | System jobs nullable. |
| `target_user_id` | UUID FK, nullable | |
| `payload` | JSONB | Before/after summaries; shape per event_type contract. |
| `created_at` | TIMESTAMPTZ | Immutable. |

**Rules**: No UPDATE/DELETE from application; migrations may archive old partitions later.

## 6. Auth-session tables (library-managed)

If using **database sessions** (see [research.md](./research.md)), include tables required by Auth.js / adapter (e.g. `Session`, `Account`, `VerificationToken`). Treat as infrastructure, not domain entities in feature specs.

**Password reset (FR-002)**: Persist **reset issuance** records compatible with Auth.js patterns (typically `VerificationToken` with identifier = user email or stable user key, hashed token, **expiry**, single table also used for email verification if desired). **Completion** (`POST /auth/reset-password` per [contracts/openapi.yaml](./contracts/openapi.yaml)) **consumes** the token row and updates `user.password_hash`; do not allow the same proof to succeed twice.

**Admin provisioning (FR-007)**: No separate domain table required beyond `user` + optional `email_verified_at` / status flags: **`direct_active`** creates a row ready to sign in (initial password set per request); **`email_invitation`** creates a pending enrollment state (e.g. `email_verified_at` null and a verification/invite token) until the recipient completes signup — exact flags are implementation detail as long as OpenAPI and spec semantics hold.

## 7. State transitions (summary)

- **User**: `active` ↔ `disabled` (admin); registration creates `active`.
- **Fighter profile**: `incomplete` → `complete` when minimum fields satisfied; can revert if policy tightens (rare; log in audit).
- **Role assignment**: created on grant; revocation sets `valid_to` (retain row for history + audit).

## Validation & invariants (cross-entity)

- Email format and normalization (lowercase storage).
- Adult attestation captured on registration (boolean + timestamp); refusal path without persisting PII beyond minimal audit if required by policy.
- **FR-011**: No tables for document vault or merge workflow.
