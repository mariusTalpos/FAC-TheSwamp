# Feature Specification: Teams & Rosters (Epic E2)

**Feature Branch**: `002-teams-rosters`

**Created**: 2026-05-21

**Status**: Draft

**Input**: Epic E2 from [suggested-epics.md](../../docs/suggested-epics.md). Fighters and squires MUST belong to a team; open fighter self-registration without team affiliation is not sufficient for competition readiness. **Team captains** approve fighters (and squires) who apply to join their team. **Marshals** and **FAC administrators** are **team-agnostic**. A single user MAY hold multiple roles simultaneously (fighter + squire + marshal + team captain + FAC admin) for **permissions now** and **event role application later** (event implementation is out of scope but informs stable identifiers and role semantics).

**References**: [docs/suggested-epics.md](../../docs/suggested-epics.md) (E2), [docs/platform-architecture-and-needs.md](../../docs/platform-architecture-and-needs.md) (§5.2, §5.7 audit slice, §6). Depends on [specs/001-foundation-identity-roles/spec.md](../001-foundation-identity-roles/spec.md) (E1).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Team records and captain assignment (Priority: P1)

A **FAC administrator** creates and maintains **team** records and designates one or more **team captains** per team so roster governance has a clear owner.

**Why this priority**: Without teams and captains, no approval workflow or roster truth exists.

**Independent Test**: As FAC admin, create a team, assign a captain user, and verify the captain can see team management entry points while a non-captain fighter cannot.

**Acceptance Scenarios**:

1. **Given** a FAC administrator, **When** they create a team with required metadata (at minimum **name**), **Then** the team exists and is eligible for membership applications.
2. **Given** an existing team, **When** a FAC administrator assigns a user as **team captain** for that team, **Then** that user gains team-scoped roster permissions for that team only.
3. **Given** a user who is captain of Team A, **When** they attempt roster actions for Team B, **Then** the action is denied.
4. **Given** a FAC administrator, **When** they update team metadata or deactivate a team per FAC policy, **Then** changes are persisted and audited.

---

### User Story 2 - Fighter applies to a team; captain approves (Priority: P1)

A **fighter** with an existing account and fighter profile **applies** to join a team. The **team captain** reviews pending applications and **approves** or **rejects** them. Until approval, the fighter is **not** on the team’s official roster.

**Why this priority**: Replaces the E1-only model where any registered fighter is implicitly competition-ready without team affiliation.

**Independent Test**: Register or sign in as a fighter with no active team membership, apply to a team, sign in as that team’s captain, approve the application, and confirm the fighter appears on the active roster; repeat with rejection and confirm the fighter does not.

**Acceptance Scenarios**:

1. **Given** a fighter with a complete or incomplete fighter profile per E1 policy, **When** they submit an application to a specific team, **Then** a **pending** membership request is created and the captain is able to see it in a pending queue.
2. **Given** a pending fighter application, **When** the team captain approves it, **Then** the fighter has an **active** roster membership on that team with a recorded **start** time.
3. **Given** a pending fighter application, **When** the team captain rejects it with an optional reason, **Then** the membership request is closed as **rejected** and the fighter is not on the active roster.
4. **Given** a fighter with an **active** membership on Team A, **When** they apply to Team B while FAC policy disallows dual affiliation, **Then** the application is blocked with a clear message (see Assumptions).
5. **Given** a fighter who is not on any team’s active roster, **When** they view their own status, **Then** the product clearly indicates they are **unaffiliated** (not roster-ready for team-based competition workflows in later epics).
6. **Given** a fighter with **active** membership on a team, **When** they view that team’s roster, **Then** they see other members with **active** (`approved`) status on that team only—**not** pending or rejected applicants.

---

### User Story 3 - Squire team affiliation (Priority: P2)

A **squire** (operational role from E1) follows the **same team-affiliation rules** as fighters: they apply to a team and require **captain approval** before they count as affiliated with that team for team-scoped permissions.

**Why this priority**: Product owner stated squires are “in the same boat” as fighters for team membership.

**Independent Test**: Provision a user with squire role, apply to a team as squire, captain approves, and verify active squire membership is visible on the team roster view appropriate to policy.

**Acceptance Scenarios**:

1. **Given** a user with the squire operational role and no active team membership, **When** they apply to join a team as a **squire**, **Then** a pending membership request is created distinct from fighter applications (or clearly typed as squire).
2. **Given** a pending squire application, **When** the team captain approves, **Then** the user has active **squire** membership on that team’s roster.
3. **Given** a user who is both fighter and squire, **When** they hold active memberships, **Then** each membership type is represented without conflating permissions (fighter roster actions vs squire-specific capabilities in later epics).

---

### User Story 4 - Roster maintenance and historical affiliation (Priority: P2)

**Team captains** and **FAC administrators** can remove members from the active roster and the system retains **historical** team affiliation for integrity of future statistics.

**Why this priority**: Platform doc requires historical affiliation; transfers and departures must not erase truth.

**Independent Test**: Remove an active member as captain; confirm they no longer appear on the active roster but their membership history shows a ended interval with timestamps.

**Acceptance Scenarios**:

1. **Given** an active roster member, **When** the team captain removes them from the roster, **Then** the membership ends with an **end** timestamp and no longer appears on the active roster.
2. **Given** an active roster member, **When** a FAC administrator performs the same removal or transfer per policy, **Then** the outcome matches captain removal semantics and is audited.
3. **Given** a fighter who previously belonged to Team A, **When** a reviewer inspects affiliation history, **Then** Team A appears as a past affiliation with date bounds (read access per role: captain for their team, FAC admin globally).

---

### User Story 5 - Team-agnostic roles unchanged (Priority: P3)

**Marshals** and **FAC administrators** continue to operate **without** team affiliation requirements. **Fighters** and **squires** gain team affiliation rules; **team captains** are team-scoped.

**Why this priority**: Clarifies the permission matrix so marshal workflows are not blocked by roster state in E2.

**Independent Test**: Assign marshal to a user with no team membership; confirm marshal capabilities (as defined in E1) still work. Confirm FAC admin can manage teams without being on a roster.

**Acceptance Scenarios**:

1. **Given** a user with only the marshal operational role, **When** they sign in, **Then** they are not required to apply to a team to use marshal-appropriate surfaces delivered in E1/E2.
2. **Given** a user who is both marshal and fighter, **When** they lack active fighter team membership, **Then** marshal capabilities remain available while fighter team-scoped capabilities remain restricted until affiliated.
3. **Given** a FAC administrator without any team membership, **When** they manage teams and rosters, **Then** they succeed per FR-007-style global governance.

---

### Edge Cases

- **E1 open registration already deployed**: Existing fighters without team affiliation are **grandfathered** as accounts but treated as **unaffiliated** until they apply and are approved (no automatic team assignment).
- **Captain leaves the team**: FAC admin MUST be able to assign a replacement captain; roster approvals MUST not stall permanently.
- **Deactivated user**: If E1 user is `disabled`, pending applications and captain actions for that user are blocked.
- **Rejected re-application**: FAC policy may allow or deny re-applying to the same team after rejection (default: allow **new** `pending` membership after rejection; configurable cooldown is optional in v1). Each re-apply MUST create a **new** `team_membership` row with a **new** id; the rejected row’s id and history MUST remain unchanged (FR-012).
- **Captain is also a fighter on the same team**: Permitted; permission checks use union of team captain + member capabilities without self-approval loopholes (captain cannot approve their own application — FAC admin or another captain if multi-captain is supported; if single captain, self-application routes to FAC admin approval — see Assumptions).
- **Last captain removed**: Block removal unless another captain exists or FAC admin assigns successor (mirrors E1 last-admin guard pattern).

### Accessibility expectations (web)

Team application, captain pending queue, approve/reject confirmations, roster list, and FAC admin team management MUST be **keyboard-operable** with **accessible names** on controls. Destructive actions (reject, remove from roster, deactivate team) MUST use confirmations and not rely on **color alone** for outcome communication.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST model **teams** as persistent records with FAC-required metadata (minimum: **name**; optional: region, tier/division, contact fields per FAC policy).
- **FR-002**: The system MUST model **team membership** linking a **user** to a **team** with **member kind** (`fighter` or `squire`), **status** (`pending`, `active`, `rejected`, `ended`), and **effective interval** (`started_at`, `ended_at`) for historical affiliation.
- **FR-003**: The system MUST allow fighters with a fighter profile (E1) to **apply** to join a team, creating a **pending** membership until decided.
- **FR-004**: **Team captains** for a team MUST be able to **approve** or **reject** pending **fighter** and **squire** applications for **that team only**.
- **FR-005**: The system MUST expose an **active roster** view per team (captain, FAC admin, **active team members**, and optionally public read — see Assumptions) listing **active** (`approved`) members with member kind. Pending and rejected applicants MUST NOT appear in this view.
- **FR-006**: **Team captains** and **FAC administrators** MUST be able to **end** an active membership (remove from roster) while retaining historical rows.
- **FR-007**: **FAC administrators** MUST be able to create/update/deactivate teams, assign/revoke **team captain** status per team, and **override** roster decisions (approve, reject, remove, transfer) with audit records.
- **FR-008**: The system MUST NOT require **marshal** or **FAC administrator** users to hold team membership for their global operational roles (E1).
- **FR-009**: The system MUST enforce that **fighter** and **squire** team-scoped actions (application, captain queue) require appropriate **active membership** or **captain**/**FAC admin** authority. **Active roster read** for a team MUST be allowed for captains, FAC admins, and users with **active** membership on that team (peers with `status = active` only).
- **FR-010**: The system MUST extend the E1 **audit log** for team and roster events at minimum: team created/updated/deactivated; captain assigned/revoked; membership applied/approved/rejected/ended; denied captain attempts on wrong team; FAC admin overrides.
- **FR-011**: The system MUST support **multi-role users** without merging identities: operational roles (E1) coexist with **team-scoped** captain and membership records; permission evaluation MUST consider role **kind** (global operational vs team-scoped).
- **FR-012**: The system MUST expose stable identifiers on membership and team suitable for **future event registration** (e.g. registering for an event as fighter vs marshal) without implementing events in this epic.
- **FR-013**: The system MUST prevent non-captains and non-admins from approving roster applications or modifying team metadata.
- **FR-014**: E1 **fighter self-registration** MAY remain, but new and existing fighters MUST be classified as **unaffiliated** until an **active** team membership exists (product copy and APIs MUST reflect this).

### Key Entities

- **Team**: Competitive unit; metadata; lifecycle (`active` / `deactivated`).
- **Team captain assignment**: User authorized for roster governance on one team (scoped, time-bounded optional).
- **Team membership**: User ↔ team link with member kind, status, and historical interval.
- **Roster application** (may be modeled as membership in `pending`/`rejected` states rather than a separate table).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance testing, **100%** of fighter applications acted on by the correct team captain result in the expected `active` or `rejected` state with no cross-team leakage.
- **SC-002**: In acceptance testing, **100%** of attempts by non-captains to approve applications for a team are denied and produce an audit entry where applicable.
- **SC-003**: For **10** roster removals performed by captains, **100%** retain a historical membership interval retrievable by FAC admin without raw database access.
- **SC-004**: A documented script covers fighter apply → captain approve → active roster appearance in under **10 minutes** for a new tester (excluding email delays).
- **SC-005**: Marshal test accounts without team membership complete E1 marshal-smoke paths with **zero** forced team-application steps introduced by E2.

### Verification expectations

Automated tests (Vitest/Playwright) SHOULD cover captain approval denial, cross-team denial, roster history, and unaffiliated fighter status. Manual script retained for FAC admin team setup.

## Assumptions

- **Single active fighter affiliation** in v1: a fighter MAY have at most one **active** `fighter` membership at a time unless FAC later amends (dual affiliation deferred).
- **Squire affiliation** follows the same single-active-team pattern per member kind unless FAC specifies otherwise.
- **Team captain self-application**: If the only captain applies to their own team as fighter/squire, **FAC administrator** approves (or a second captain if FAC enables multi-captain later).
- **Public roster pages**: Optional in v1; default authenticated captain + FAC admin + **active member** may read the **active roster** (approved peers on their team, not pending applicants); public team page can be added if FAC wants discovery (call out in plan/contracts if included).
- **Transfers**: Implemented as end membership on Team A + apply/approve on Team B unless FAC mandates admin-only transfer shortcut (admin override in FR-007 covers this).
- **Operational role `squire` from E1** remains the global role label; **team squire membership** is the affiliation record used for team-scoped permissions in later epics.
- **Team captain** is introduced in E2 as a **team-scoped** capability, not a replacement for E1 operational roles.

## Dependencies

- **E1 complete**: users, fighter profiles, operational roles (`marshal`, `squire`, `fac_admin`, etc.), audit baseline, RBAC patterns.
- FAC policy inputs: team metadata fields, whether public roster is enabled, dual-affiliation rules, re-application after rejection.

## Out of scope (this epic)

- Event creation, registration, schedules, or registering users **for an event** in a given role (Epic E3+).
- Match lineups and results (Epic E4).
- Standings and public career aggregates beyond optional read-only roster/team pages (Epic E5).
- Automated transfer windows, roster size caps, and equipment/medical eligibility (encode only if FAC provides concrete rules in v1 — otherwise defer to a later epic).
- Email notifications for application status (optional; product-level triggers may be noted but channels deferred to engagement epic).
