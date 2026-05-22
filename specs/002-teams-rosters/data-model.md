# Data Model: Teams & Rosters (Epic E2)

Entities extend [E1 data model](../001-foundation-identity-roles/data-model.md). Foreign keys use E1 `user.id` (text) and existing audit patterns.

## 1. `team`

Persistent competitive unit.

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID PK | Stable for exports and future `event_team` links. |
| `name` | TEXT, NOT NULL | Display name; unique per FAC policy (optional UNIQUE on normalized name). |
| `slug` | TEXT, UNIQUE, nullable | URL-safe identifier for public pages if enabled. |
| `region` | TEXT, nullable | Optional metadata (FR-001). |
| `tier_or_division` | TEXT, nullable | Optional competitive tier label. |
| `contact_email` | TEXT, nullable | Optional FAC contact (FR-001). |
| `contact_phone` | TEXT, nullable | Optional FAC contact (FR-001). |
| `status` | ENUM: `active`, `deactivated` | Deactivated teams block new applications. |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Relationships**: 0..n `team_membership`, 0..n `team_captain_assignment`.

## 2. `team_captain_assignment`

Team-scoped governance (not an E1 `operational_role` row).

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID PK | |
| `team_id` | UUID FK → `team.id` | |
| `user_id` | TEXT FK → `user.id` | |
| `assigned_by_user_id` | TEXT FK → `user.id` | FAC admin (or delegated policy). |
| `valid_from` | TIMESTAMPTZ | Default `now()`. |
| `valid_to` | TIMESTAMPTZ, nullable | Revocation sets end; null = active captain. |

**Rules**:

- Partial unique: (`team_id`, `user_id`) WHERE `valid_to IS NULL`.
- **FR-007 / last captain**: Application guard — cannot revoke last active captain without successor (mirror E1 FR-013).
- Captain does not imply `fighter` membership; same user may be captain and applicant.

## 3. `team_membership`

Roster affiliation, pending applications, and history (FR-002, FR-003, FR-006).

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID PK | Exposed for future event registration (FR-012). |
| `team_id` | UUID FK → `team.id` | |
| `user_id` | TEXT FK → `user.id` | |
| `member_kind` | ENUM: `fighter`, `squire` | Distinct queues and active roster columns. |
| `status` | ENUM: `pending`, `active`, `rejected`, `ended` | |
| `requested_at` | TIMESTAMPTZ | Set on apply. |
| `started_at` | TIMESTAMPTZ, nullable | Set on approve → `active`. |
| `ended_at` | TIMESTAMPTZ, nullable | Set on remove/transfer/end. |
| `decided_at` | TIMESTAMPTZ, nullable | Approve/reject timestamp. |
| `decided_by_user_id` | TEXT FK, nullable | Captain or FAC admin user id. |
| `decision_note` | TEXT, nullable | Optional reject reason. |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Indexes / constraints**:

- Partial unique: (`user_id`, `member_kind`) WHERE `status = 'active'` — at most one active fighter team and one active squire team per user (v1).
- Partial unique: (`user_id`, `team_id`, `member_kind`) WHERE `status = 'pending'` — one open application per kind per team.
- Query helpers: active roster = `status = 'active'`; pending queue = `status = 'pending'` for `team_id`.

**State transitions**:

```text
(apply) → pending
pending → active   (approve; sets started_at, decided_*)
pending → rejected (reject; decided_*)
active  → ended    (captain/admin remove; sets ended_at)
```

Rejected rows may spawn a **new** `pending` row on re-apply (Assumptions).

## 4. Derived: user affiliation summary (not necessarily a table)

Computed for APIs/UI:

| Concept | Rule |
|---------|------|
| Fighter affiliation | Latest `active` row where `member_kind = fighter`, else `unaffiliated`. |
| Squire affiliation | Latest `active` row where `member_kind = squire`, else none. |
| Roster-ready fighter | Has fighter profile (E1) AND active fighter membership (product copy). |

Optional materialized view or cached column on `fighter_profile` is **implementation detail**; spec requires correct read semantics.

## 5. Permission evaluation (logical)

| Actor | Team metadata | Pending queue | Approve/reject | Active roster | End membership | Admin override |
|-------|---------------|---------------|----------------|---------------|----------------|----------------|
| Anonymous | Public team only if enabled | No | No | Public roster only if enabled | No | No |
| Fighter (self) | Read teams list/apply | Own pending | No | **Active roster on own team** (approved peers only) | No | No |
| Squire (self) | Same as fighter for squire `member_kind` | Own pending | No | **Active roster on own team** (approved peers only) | No | No |
| Team captain (team T) | Read T | T queue | T pending | T roster | T members | No |
| Marshal | No team required | No | No | No | No | No |
| FAC admin | All | All | All | All | All (via `POST /admin/.../end`) | Yes |

Global `marshal`, `fac_admin`, etc. still loaded from E1 `role_assignment`.

## 6. Audit events (extensions)

Append-only `audit_event` payloads should include `team_id`, `membership_id`, `member_kind`, and before/after `status` where relevant. See [research.md](./research.md) §8 for `event_type` list.

## 7. Future event registration (informative only)

Not implemented in E2. Suggested shape for Epic E3 planners:

```text
event_participant (
  event_id,
  user_id,
  participation_kind,  -- fighter | squire | marshal | ...
  team_membership_id NULL,  -- required when participation_kind in (fighter, squire)
  operational_role_id NULL -- required when participation_kind = marshal
)
```

E2 MUST keep `team_membership.id` immutable for the life of a row so historical event rows can reference ended memberships.

## 8. E1 tables unchanged in meaning

- `user`, `fighter_profile`, `operational_role`, `role_assignment`, `audit_event` — no semantic breaking changes.
- Seed data: **do not** add `team_captain` to `operational_role`; captains are team-scoped only.
