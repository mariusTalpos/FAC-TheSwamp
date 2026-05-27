# Phase 0 — Research: Events & Registration (Epic E3)

Decisions build on the **implemented E1 + E2 stack** ([001 research](../001-foundation-identity-roles/research.md), [002 research](../002-teams-rosters/research.md)): Next.js App Router, PostgreSQL, Drizzle, Auth.js sessions, application RBAC, append-only audit, `apps/web` monolith.

## 1. Event organizer: global role vs per-event ownership

**Decision**: Keep **global** event-creation capability on the existing E1 operational role key **`organizer`** (seeded in `operational-roles.ts`). Add **`event.organizer_user_id`** (FK → `user.id`) as the **sole per-event owner** for edit/publish/schedule/registration oversight. FAC administrators may reassign `organizer_user_id` to another user who holds an active `organizer` role assignment.

**Rationale**: Spec FR-010/FR-010b require many global holders but exactly one owner per event. E1 already provisions `organizer@fac.test`; renaming to `event_organizer` would break seeds and docs without user value.

**Alternatives considered**:

- **Per-event organizer table with history**: Useful for audit replay; v1 uses `organizer_user_id` plus audit event `event.organizer_reassigned` with prior/new ids in payload.
- **Creator-only implicit ownership without column**: Cannot support FR-010c reassignment cleanly.

## 2. Permission layer (third slice)

**Decision**: Add **`src/lib/events/permissions.ts`** evaluated after session + E1 operational roles:

| Capability | Who |
|------------|-----|
| Create event | `fac_admin` OR active `organizer` role |
| Edit/publish/cancel/schedule/registrations for event E | `fac_admin` OR `event.organizer_user_id === session.user.id` |
| Sanction / revoke sanction / reassign organizer / revoke global organizer | `fac_admin` only |
| Fighter self-register | Authenticated user with fighter profile; event published + registration open |
| Staff self-register | User with matching operational role (e.g. `marshal`) |
| View registration summary | Event organizer, `fac_admin` |
| View schedule (participant) | Any registration on event (fighter or staff) |

**Rationale**: Mirrors E2’s separation of global vs scoped permissions; prevents Organizer B editing Organizer A’s event (spec US1 scenario 4).

**Alternatives considered**:

- **Reuse team captain layer**: Wrong domain; captains have no registration approval in E3.

## 3. Registration model: fighter vs staff, no captain gate

**Decision**: Single table **`event_registration`** with:

- `registration_kind`: `fighter` | `staff`
- `staff_operational_role_key` (nullable; e.g. `marshal`) when kind = staff
- `status`: `confirmed` | `waitlisted` | `withdrawn` | `cancelled`
- Optional **`team_id`** + **`team_membership_id`** snapshot at confirm time (informational; no captain approval)
- Partial unique: (`event_id`, `user_id`, `registration_kind`) WHERE `status IN ('confirmed','waitlisted')` — blocks duplicate competitor rows; allows fighter + staff for same user

**Rationale**: FR-004–FR-008, FR-010e; E2 affiliation is optional context only.

**Alternatives considered**:

- **Separate fighter_registration and staff_registration tables**: Clearer names; rejected for duplicated capacity/waitlist logic.

## 4. Capacity and waitlist (FIFO)

**Decision**: `event.fighter_capacity` (integer, nullable = unlimited). On register, run in **transaction**: count `confirmed` fighter registrations; if at capacity → `waitlisted` with `waitlist_position` by `confirmed_at` ordering; on withdraw/cancel → promote oldest waitlisted to `confirmed` in same transaction.

**Rationale**: FR-008, edge cases; spec default FIFO.

**Alternatives considered**:

- **Application-level queue table**: Overkill for v1; position derivable from `waitlisted_at`.

## 5. Registration windows and timezones

**Decision**: Store **`timezone`** as IANA string (e.g. `America/New_York`) on `event`. Persist all instants as **`timestamptz`** (`starts_at`, `registration_opens_at`, `registration_closes_at`, schedule times). Enforce windows by converting “now” and boundaries consistently in the event timezone in the service layer (use `Temporal` or `luxon` — pick one library in implementation, document in quickstart).

**Rationale**: FR-003, accessibility (timezone in visible text), platform §5.3.

**Alternatives considered**:

- **Local datetime without tz**: Rejected — ambiguous for multi-region FAC events.

## 6. Event lifecycle state machine

**Decision**: Column `lifecycle_status`: `draft` → `published` → `registration_closed` → `in_progress` → `completed`; terminal `cancelled` from draft or published. Separate boolean **`is_sanctioned`** (FAC admin only). Registration allowed when `published` and within window and not `cancelled`.

**Rationale**: FR-001; keeps sanctioning independent of lifecycle.

**Alternatives considered**:

- **Single enum including sanctioned**: Conflates governance flag with operational phase.

## 7. Schedule entries and change log

**Decision**:

- **`schedule_entry`**: `event_id`, `label`, `scheduled_start_at`, optional `scheduled_end_at`, `status` (`planned` | `delayed` | `cancelled`), optional `venue_label_override`, optional `event_registration_id` link for participant slot, `sort_order` / `display_sequence`.
- **`schedule_change_record`**: append-only rows on material edits (time, venue override, status) with `field_name`, `prior_value`, `new_value`, `actor_user_id`, `reason` (optional text), `created_at`.
- **Overlap policy**: API returns `warnings[]` on overlap; client may pass `acknowledgeScheduleWarnings: true` to persist (spec default: warn + allow).

**Rationale**: FR-011–FR-012, US4–US5; prepares E4 `match` foreign key to `schedule_entry.id`.

**Alternatives considered**:

- **Audit-only without schedule_change_record**: Insufficient for FR-012 ordered history UX.

## 8. Organizer on-behalf registration

**Decision**: `POST /events/{eventId}/registrations/fighter/on-behalf` restricted to event organizer + `fac_admin`; uses same confirmation/waitlist service as self-register; audit `registration.fighter_on_behalf`.

**Rationale**: FR-006a override path without making it the default flow.

## 9. Public event discovery

**Decision**: Authenticated **`GET /events`** (upcoming published). Optional **`GET /public/events`** behind env flag `PUBLIC_EVENTS` (default `false`), mirroring E2 `PUBLIC_TEAM_ROSTER`.

**Rationale**: Assumptions — authenticated-first; optional public read.

## 10. Audit extensions

**Decision**: Reuse `insertAuditEvent` with types including: `event.created`, `event.updated`, `event.published`, `event.started`, `event.completed`, `event.cancelled`, `event.sanctioned`, `event.sanction_revoked`, `event.organizer_reassigned`, `registration.fighter_confirmed`, `registration.fighter_waitlisted`, `registration.fighter_withdrawn`, `registration.staff_confirmed`, `registration.staff_withdrawn`, `registration.withdrawn_by_organizer`, `registration.action_denied`, `schedule_entry.created`, `schedule_entry.updated`, `schedule_entry.cancelled`, `event.action_denied`.

**Rationale**: FR-014; consistent with E1/E2.

## 11. Testing

**Decision**: **Vitest** integration tests for registration state machine, capacity/waitlist promotion, permission matrix (cross-organizer denial, organizer-as-fighter), schedule change log; **Playwright** for SC-004 path (publish → fighter register → marshal register → view schedule).

**Rationale**: Spec verification expectations and constitution evidence.

## 11a. Fighter attendance confirmation

**Decision**: Support an optional per-event attendance confirmation requirement for fighter registrations. When configured, initial fighter registration creates a `submitted` registration (or `confirmed` when no confirmation is required); fighters must confirm attendance by the event’s configured deadline (derived from startsAt minus N days). Unconfirmed registrations are withdrawn/cancelled at deadline and capacity is freed, promoting waitlisted registrations in FIFO order where applicable.

**Rationale**: Reduces no-shows while preserving fighter-driven self-registration (no captain gate) and avoiding an organizer approval queue.

## 12. Competition format / fight types

**Decision**: **No `format_key` (or equivalent) on `event`**. An event may host multiple fight types (5v5, 3v3, duel, etc.); format belongs on **matches** in Epic E4, not as a single enum on the event header. E3 may use free-text `description` for human-readable scope until E4 models formats.

**Rationale**: A single event-level format field is redundant and misleading for mixed-format tournaments; registration and scheduling in E3 do not depend on per-event format.

**Alternatives considered**:

- **Required `format_key` on event** (spec FR-002 wording): Rejected for data model—defer structured format to E4; product copy can live in `description` for v1.

## 13. Out of scope confirmation

**Decision**: No `match`, `bracket`, `result`, or `standing` tables/APIs in E3. `schedule_entry` may carry optional placeholder text for future E4 binding.

**Rationale**: FR-015; keeps epic bounded.
