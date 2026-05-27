# Data Model: Events & Registration (Epic E3)

Entities extend [E1](../001-foundation-identity-roles/data-model.md) and [E2](../002-teams-rosters/data-model.md). Foreign keys use E1 `user.id` (text) and E2 `team.id` / `team_membership.id` where noted.

## 1. `event`

Sanctioned occurrence and registration anchor.

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID PK | Stable for E4 match linkage (FR-016). |
| `name` | TEXT NOT NULL | Display name (FR-002). |
| `description` | TEXT, nullable | Optional long text; may summarize competition scope in prose until E4 defines structured fight types. |
| `timezone` | TEXT NOT NULL | IANA identifier (FR-002). |
| `starts_at` | TIMESTAMPTZ NOT NULL | Event start (FR-002). |
| `ends_at` | TIMESTAMPTZ, nullable | Optional end. |
| `venue_label` | TEXT NOT NULL | Location label (FR-002). |
| `lifecycle_status` | ENUM | See §1.1. |
| `is_sanctioned` | BOOLEAN NOT NULL DEFAULT false | FAC admin only (FR-001). |
| `sanctioning_notes` | TEXT, nullable | Optional admin notes. |
| `organizer_user_id` | TEXT FK → `user.id` NOT NULL | Sole per-event owner (FR-010b). |
| `registration_opens_at` | TIMESTAMPTZ, nullable | Window start (FR-003). |
| `registration_closes_at` | TIMESTAMPTZ, nullable | Window end (FR-003). |
| `fighter_capacity` | INTEGER, nullable | Null = unlimited; counts fighter kind only (Assumptions). |
| `staff_capacity` | JSONB, nullable | Optional per-role caps, e.g. `{ "marshal": 20 }`. |
| `fighter_confirmation_required_days_before` | INTEGER, nullable | When set, fighters must confirm attendance by `starts_at - N days` or be withdrawn/cancelled per policy. |
| `created_by_user_id` | TEXT FK → `user.id` | Creator (usually same as organizer at create). |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| `published_at` | TIMESTAMPTZ, nullable | Set on publish. |
| `cancelled_at` | TIMESTAMPTZ, nullable | Set on cancel. |
| `cancellation_reason` | TEXT, nullable | Shown to registrants when provided (US1). |

### 1.1 `lifecycle_status` enum

`draft` | `published` | `registration_closed` | `in_progress` | `completed` | `cancelled`

**Transitions** (application-enforced):

```text
draft → published (publish)
published → registration_closed (close registration / auto at window end optional)
registration_closed → in_progress (event day / manual)
in_progress → completed
draft|published → cancelled (admin or organizer per policy)
```

### 1.2 Rules

- **No `format_key` on `event`**: An event may include multiple fight or match types (5v5, 3v3, duel, etc.). Modeling formats belongs in **Epic E4** (matches, brackets, lineups). A single catalog key on the event would be wrong for mixed-format tournaments and is intentionally omitted in E3.
- Only `fac_admin` toggles `is_sanctioned` / `sanctioning_notes`.
- `organizer_user_id` mutable only via FAC admin reassignment (FR-010c) with audit.
- List/query indexes: `(lifecycle_status, starts_at)` for upcoming published events (FR-009).

## 2. `event_registration`

Links event to a registrant as fighter competitor or staff.

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID PK | Stable for schedule links and E4 (FR-016). |
| `event_id` | UUID FK → `event.id` | |
| `user_id` | TEXT FK → `user.id` | Registrant. |
| `registration_kind` | ENUM: `fighter`, `staff` | FR-007. |
| `staff_operational_role_key` | TEXT, nullable | Required when kind = `staff` (e.g. `marshal`). |
| `status` | ENUM | See §2.1. |
| `team_id` | UUID FK → `team.id`, nullable | Snapshot at confirm (FR-006). |
| `team_membership_id` | UUID FK → `team_membership.id`, nullable | Optional stronger snapshot. |
| `team_name_snapshot` | TEXT, nullable | Denormalized display if team renamed later. |
| `submitted_at` | TIMESTAMPTZ NOT NULL | Timestamp of initial registration submission (created_at may differ only if backfilled). |
| `confirmed_at` | TIMESTAMPTZ, nullable | Set when status → `confirmed`. |
| `waitlisted_at` | TIMESTAMPTZ, nullable | Set when status → `waitlisted`. |
| `withdrawn_at` | TIMESTAMPTZ, nullable | Self or organizer withdraw. |
| `withdrawn_by_user_id` | TEXT FK, nullable | Actor for organizer/admin withdraw. |
| `withdrawal_reason` | TEXT, nullable | Policy / admin reason. |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### 2.1 `status` enum

`submitted` | `confirmed` | `waitlisted` | `withdrawn` | `cancelled`

(`cancelled` used for event cancellation cascade — US1 scenario 5.)

### 2.2 Constraints

- Partial unique: (`event_id`, `user_id`, `registration_kind`) WHERE `status IN ('confirmed','waitlisted')`.
- Fighter register requires E1 fighter profile; user `status = active`.
- Staff register requires active E1 role assignment matching `staff_operational_role_key`.
- **No** captain approval column or workflow.

### 2.3 State transitions

```text
(submit, capacity available) → submitted (or confirmed when no attendance confirmation is required)
(submit, at capacity)         → waitlisted
submitted → confirmed         (fighter confirms attendance before deadline)
waitlisted → confirmed        (promotion on capacity free, FIFO)
confirmed|waitlisted → withdrawn (self or organizer/admin)
* → cancelled                 (event cancelled)
```

## 3. `schedule_entry`

Planned run-of-show slot (FR-011).

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID PK | E4 may reference this row. |
| `event_id` | UUID FK → `event.id` | |
| `label` | TEXT NOT NULL | e.g. "Pool A — Match 3", "Lunch". |
| `scheduled_start_at` | TIMESTAMPTZ NOT NULL | |
| `scheduled_end_at` | TIMESTAMPTZ, nullable | Or derive from duration. |
| `duration_minutes` | INTEGER, nullable | Alternative to end time. |
| `status` | ENUM: `planned`, `delayed`, `cancelled` | US5. |
| `venue_label_override` | TEXT, nullable | Per-entry venue shift. |
| `event_registration_id` | UUID FK, nullable | Link to participant registration. |
| `placeholder_label` | TEXT, nullable | TBD slot before registration known. |
| `sort_order` | INTEGER NOT NULL | Board ordering tie-breaker. |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Rules**: Chronological display by `scheduled_start_at`, then `sort_order`. Overlap detection in service layer (research §7).

## 4. `schedule_change_record`

Append-only schedule edit history (FR-012).

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID PK | |
| `schedule_entry_id` | UUID FK → `schedule_entry.id` | |
| `event_id` | UUID FK → `event.id` | Denormalized for event-level history query. |
| `field_name` | TEXT NOT NULL | e.g. `scheduled_start_at`, `status`. |
| `prior_value` | TEXT, nullable | Serialized prior. |
| `new_value` | TEXT, nullable | Serialized new. |
| `reason` | TEXT, nullable | Organizer-provided (US5). |
| `actor_user_id` | TEXT FK → `user.id` | |
| `created_at` | TIMESTAMPTZ | |

Also emit matching `audit_event` rows for admin investigation (FR-014).

## 5. Permission evaluation (logical)

| Actor | Create event | Edit own event | Edit other's event | Sanction | Reassign organizer | Fighter self-reg | Staff self-reg | Reg summary | Schedule edit |
|-------|--------------|----------------|--------------------|----------|--------------------|------------------|----------------|-------------|---------------|
| Anonymous | No | No | No | No | No | No | No | No | No |
| Fighter | No | No | No | No | No | Yes (if open) | No | Own only | Read if registered |
| Marshal | No | No | No | No | No | Yes (if fighter profile) | Yes (marshal) | Own only | Read if registered |
| Global `organizer` | Yes | If `organizer_user_id` | No | No | No | Yes | If roles | If owner | If owner |
| Event organizer (per event) | Yes | Yes | No | No | No | Yes | If roles | Yes | Yes |
| `fac_admin` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

Global `organizer` without per-event ownership has **no** edit rights on another user’s event (spec edge case).

## 6. Audit events (extensions)

Payload should include `event_id`, `registration_id`, `schedule_entry_id`, and relevant before/after fields. See [research.md](./research.md) §10 for `event_type` list.

## 7. Future E4 binding (informative)

Not implemented in E3. Suggested shapes:

```text
-- Fight/match type is per match (or bracket segment), not per event.
match (
  id,
  event_id,
  format_key,              -- e.g. team_5v5, team_3v3, duel
  schedule_entry_id NULL,
  ...
)
```

`event_registration.id` remains the participant anchor for lineups. One event may reference many `match` rows with different `format_key` values.

## 8. E1 operational role key mapping

| Spec term | E1 `operational_role.key` |
|-----------|---------------------------|
| Event organizer (global) | `organizer` |
| Marshal (staff reg) | `marshal` |
| FAC administrator | `fac_admin` |
