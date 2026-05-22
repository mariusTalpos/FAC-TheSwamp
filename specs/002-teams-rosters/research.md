# Phase 0 — Research: Teams & Rosters (Epic E2)

Decisions for Epic E2 build on the **implemented E1 stack** ([001 research](../001-foundation-identity-roles/research.md)): Next.js App Router, PostgreSQL, Drizzle, Auth.js sessions, application RBAC, append-only audit.

## 1. Team-scoped permissions vs E1 operational RBAC

**Decision**: Introduce a **second permission layer** — **team-scoped** capabilities (`team_captain`, roster membership) — evaluated **after** session identity and **alongside** E1 `operational_role` assignments. Global roles (`marshal`, `fac_admin`, `organizer`) remain unchanged; `squire` stays a global operational label while **team squire membership** drives affiliation.

**Rationale**: FR-008/FR-011 require marshals and FAC admins to be team-agnostic; fighters and squires need affiliation without overloading E1’s flat `role_assignment` table with per-team rows for every operational role.

**Alternatives considered**:

- **Single RBAC table with team_id nullable**: One table for all roles; workable but mixes FAC-global and team-local semantics and complicates queries (“is this user marshal?” vs “captain of which team?”).
- **External policy engine (OPA)**: Still overkill for v1.

## 2. Membership as state machine (not separate application entity)

**Decision**: Model **applications and roster history** in one `team_membership` table using **status** (`pending`, `active`, `rejected`, `ended`) and timestamps (`requested_at`, `started_at`, `ended_at`, `decided_at`, `decided_by_user_id`). At most one **open** pending request per (user, team, member_kind) via partial unique index.

**Rationale**: FR-002/FR-003/FR-006 need history and pending queue without duplicate entities; aligns with E1 `role_assignment` valid_from/valid_to pattern.

**Alternatives considered**:

- **Separate `roster_application` + `membership` tables**: Clearer naming but more joins; acceptable if team prefers — rejected for v1 simplicity.

## 3. Team captain assignment

**Decision**: `team_captain_assignment` table: `user_id`, `team_id`, `assigned_by_user_id`, `valid_from`, `valid_to` (null = active). Support **multiple active captains** per team in schema; v1 UI may still expose single-captain flows unless FAC requests otherwise.

**Rationale**: FR-007 and edge case “captain leaves” need successor assignment; multi-captain avoids deadlock without FAC admin for every approval.

**Alternatives considered**:

- **Captain as boolean on membership**: Conflates fighter membership with governance role.

## 4. Fighter registration vs affiliation (E1 migration path)

**Decision**: **Keep** E1 `POST /auth/register/fighter` and profile flows; add **affiliation status** derived from active `fighter` memberships (`unaffiliated` | `active` on team X). UI and APIs surface “not on a team roster” clearly (FR-014). No hard gate on registration in v1 unless FAC amends spec — **soft gate** for competition readiness messaging.

**Rationale**: User asked to move away from “anyone registered is implicitly ready”; breaking registration would harm existing accounts and E1 tests.

**Alternatives considered**:

- **Registration requires team pick**: Stronger but needs team directory at signup and blocks marshal-only users; deferred.

## 5. Self-approval and captain-as-fighter

**Decision**: If `applicant_user_id` equals any **active captain** for that team, **route approval to FAC admin** (or second captain when multi-captain enabled). Captains cannot approve their own pending row (FR-004 enforcement in service layer).

**Rationale**: Edge case in spec; prevents integrity loophole.

## 6. Dual affiliation and transfers

**Decision**: Enforce **at most one active `fighter` membership** and **at most one active `squire` membership** per user in v1 (application layer + DB partial unique indexes).

**Roster removal**: `POST /captain/teams/{teamId}/memberships/{membershipId}/end` and `POST /admin/teams/{teamId}/memberships/{membershipId}/end` both call `membership-service.end` (status `active` → `ended`, `ended_at` set). Captain route uses `requireCaptainOfTeam`; admin route uses `requireFacAdmin`. Audit: `membership.ended`; FAC admin actions also record `membership.admin_override` in payload per FR-007.

**Transfer** (not a single HTTP operation): (1) end active membership on Team A via captain or admin **end**; (2) fighter applies to Team B; (3) captain or FAC admin **decide** approve on Team B—or admin **decide** approve if fast-path. Dual-affiliation guard blocks step 2 until step 1 completes.

**Rationale**: Platform doc mentions dual-affiliation rules “only what FAC enforces”; default single-team is safest for Buhurt roster integrity until FAC publishes an exception. Separating **decide** (pending only) from **end** (active only) matches FR-006/FR-007 and avoids overloading `MembershipDecisionRequest`.

## 7. Future event registration (design influence only)

**Decision**: Persist stable UUIDs on `team`, `team_membership`, and expose `member_kind` in API projections. Document in [data-model.md](./data-model.md) a **future** `event_participant` reference shape (`user_id`, `membership_id` or `member_kind`, `operational_role_key`) without tables in E2.

**Rationale**: FR-012; user explicitly noted multi-role event signup later.

## 8. Audit extensions

**Decision**: Reuse E1 `audit_event` with new `event_type` values: `team.created`, `team.updated`, `team.deactivated`, `team_captain.assigned`, `team_captain.revoked`, `membership.applied`, `membership.approved`, `membership.rejected`, `membership.ended`, `membership.action_denied`, `membership.admin_override`.

**Rationale**: FR-010; consistent with E1 append-only pattern.

## 9. Public read surfaces

**Decision**: Ship **authenticated-first** roster APIs in v1; add **optional** `GET /public/teams/{teamId}` read model if FAC enables public rosters in assumptions (default **off** until FAC confirms — documented in quickstart).

**Rationale**: Platform doc §9 public vs authenticated still open; avoids over-exposing minors/contact data on teams until policy set.

## 10. Testing

**Decision**: Extend **Vitest** integration tests for membership state transitions and permission matrix; **Playwright** journeys: unaffiliated fighter apply → captain approve; cross-team captain denial; marshal without team; admin override; history after removal.

**Rationale**: Maps to SC-001–SC-005 and constitution evidence requirements.
