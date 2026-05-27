# Feature Specification: Events & Registration (Epic E3)

**Feature Branch**: `003-events-registration`

**Created**: 2026-05-26

**Status**: Draft

**Input**: Epic E3 from [suggested-epics.md](../../docs/suggested-epics.md). FAC can define **sanctioned events**; **fighters** self-register for events **without team captain approval**; a **planned schedule** exists and may **diverge from the plan** with a **traceable change history**. Match execution, official results, and standings remain out of scope (Epics E4–E5).

**Refinement** (2026-05-26): Registration is **fighter-driven** for all events. Team-format labels describe competition structure, not a separate captain-gated registration workflow.

**Refinement** (2026-05-26): **Event organizer** is a global E1 operational role—**multiple users** may hold it at once. Each event has **exactly one** organizer (the creator by default). Holders may create events without per-event FAC approval; **FAC administrators** may **reassign** an event’s organizer or revoke the global role to address abuse. Organizers **may** also register as **marshal** or **fighter** in events they organize.

**References**: [docs/suggested-epics.md](../../docs/suggested-epics.md) (E3), [docs/platform-architecture-and-needs.md](../../docs/platform-architecture-and-needs.md) (§5.3, §5.7 audit slice, §6). Depends on [specs/001-foundation-identity-roles/spec.md](../001-foundation-identity-roles/spec.md) (E1) and [specs/002-teams-rosters/spec.md](../002-teams-rosters/spec.md) (E2).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and publish a sanctioned event (Priority: P1)

A user with the **event organizer** operational role (E1) or a **FAC administrator** creates an event with FAC-required metadata, capacity and registration rules, and venue/time details. The **creating user** becomes that event’s **sole organizer**. Multiple people may hold the organizer role at the same time and each may create events independently.

**Why this priority**: No event record means no registration or schedule; this is the anchor for all later competition workflows.

**Independent Test**: As a user with event organizer role, create an event in draft, complete required fields, publish with registration open, and verify you are recorded as the event’s organizer and another user with organizer role cannot edit your event; verify FAC admin can reassign organizer and the new organizer gains edit access.

**Acceptance Scenarios**:

1. **Given** a user with the **event organizer** operational role or a FAC administrator, **When** they create an event with required metadata (at minimum **name**, **start date/time**, **venue or location label**, and **timezone**), **Then** the event is saved, the creator is recorded as its **sole organizer**, and the event is eligible to be published.
2. **Given** a draft event, **When** its **event organizer** or a FAC administrator publishes it with registration **open**, **Then** eligible users can discover the event and begin registration within defined rules.
3. **Given** a published event, **When** a FAC administrator marks it **sanctioned** (official for FAC ranking/record purposes), **Then** the event displays sanctioned status and only FAC administrators may revoke sanctioning.
4. **Given** an event owned by Organizer A, **When** Organizer B (also holding the global organizer role) or any non-admin user without ownership attempts to change core metadata, **Then** the action is denied.
5. **Given** a FAC administrator, **When** they cancel an event with existing registrations (including events they did not create), **Then** registrations are marked cancelled or withdrawn per policy and affected registrants can see the cancellation reason where FAC provides one.
6. **Given** a FAC administrator addressing abuse or operational need, **When** they **reassign** an event’s organizer to another user who holds the **event organizer** operational role, **Then** the new user becomes the sole organizer, the prior organizer loses edit access for that event, and the change is audited.
7. **Given** a FAC administrator addressing abuse, **When** they revoke a user’s **event organizer** operational role globally or cancel an event, **Then** the action succeeds and is audited.

---

### User Story 2 - Fighter self-registration for all events (Priority: P1)

Any **fighter** with an account and fighter profile (E1) can **register themselves** for any published event with open registration—regardless of event format label (e.g. 5v5, 3v3, duel) and **without approval from a team captain**. Team affiliation (E2) is **not** a prerequisite to register.

**Why this priority**: Registration is the primary community action after event publish; gating it through captains would block the intended self-serve workflow.

**Independent Test**: Publish events with different format labels; as fighters with and without active team membership, self-register for each; confirm registrations are confirmed when capacity and window rules pass, with no captain step in the flow.

**Acceptance Scenarios**:

1. **Given** a published event with open registration, **When** an eligible fighter submits self-registration, **Then** a fighter registration is created when capacity and eligibility rules pass—**no team captain action required**.
2. **Given** a fighter with **no active team affiliation** (E2 unaffiliated), **When** they register for any event, **Then** registration succeeds when other event rules pass (capacity, window, account status).
3. **Given** a fighter with **active** team membership on Team A, **When** they register for an event, **Then** the registration succeeds and **may record** Team A as informational affiliation at registration time without requiring captain approval.
4. **Given** a fighter already registered for an event, **When** they attempt to register again for the same event as a competitor, **Then** the duplicate is blocked with a clear message.
5. **Given** a fighter who registered before the cutoff, **When** they withdraw their own registration before the event, **Then** status updates to withdrawn, capacity frees if applicable, and the action is auditable.
6. **Given** registration at capacity, **When** an eligible fighter attempts to register, **Then** they are placed on a **waitlist** or blocked per event policy with a clear status.
7. **Given** an event where the organizer configured pre-event attendance confirmation, **When** a fighter has registered, **Then** they MUST confirm they are still attending by the configured deadline or their registration is withdrawn/cancelled per policy and capacity is made available for waitlist promotion.

---

### User Story 3 - Staff role registration (Priority: P2)

Users with operational roles (e.g. **marshal**) register for an event **in that staff role** when the event accepts staff registration—distinct from fighter competitor registration.

**Why this priority**: Events need staffed officials; staff signup must not be conflated with fighter competitor entries.

**Independent Test**: Publish an event with marshal registration open; register as a user with marshal role; verify staff registration is recorded separately from any fighter registration for the same user.

**Acceptance Scenarios**:

1. **Given** an event that accepts marshal (or other operational) staff registration, **When** a user with the appropriate E1 operational role self-registers as **marshal** for that event, **Then** a staff registration distinct from any fighter registration is recorded.
2. **Given** a user registered as marshal for an event, **When** they also register as a fighter for the same event where both are allowed, **Then** both registrations coexist without overwriting each other.
3. **Given** the **event organizer** of an event who also holds **marshal** and/or **fighter** roles, **When** they register for that same event as marshal or fighter, **Then** those registrations succeed under the same rules as any other user (no special block because they created the event).
4. **Given** a user without the required operational role, **When** they attempt staff registration for that role, **Then** the action is denied with a clear message.

---

### User Story 4 - Planned schedule board (Priority: P2)

An **event organizer** or **FAC administrator** builds a **planned schedule** for an event—time-ordered **schedule entries** (e.g. match slots, breaks, ceremonies) linked to the event—so participants and staff know the intended run of show before competition day.

**Why this priority**: Scheduling is core to §5.3; E4 will attach match lifecycle to these anchors.

**Independent Test**: For a published event with registrations, create schedule entries with start times and labels; view the schedule board as organizer and as a registered participant; confirm ordering and timezone display.

**Acceptance Scenarios**:

1. **Given** a published event, **When** the event’s **organizer** (or a FAC administrator) adds schedule entries with scheduled start time, optional end or duration, label, and optional link to a registration or placeholder participant slot, **Then** entries appear on the event schedule board in chronological order.
2. **Given** a schedule board, **When** a registered participant views the event, **Then** they see the current planned schedule in the event’s timezone with human-readable local times.
3. **Given** overlapping schedule entries, **When** the organizer saves the schedule, **Then** the system warns or blocks per FAC policy (default: warn on overlap, allow save with acknowledgment).
4. **Given** an event with no schedule yet, **When** a participant views the event, **Then** the product indicates schedule is not yet published rather than showing an empty broken view.

---

### User Story 5 - Schedule change log and as-run divergence (Priority: P2)

When the **planned schedule** changes (delays, reordering, venue or time shifts), authorized staff record updates and the system retains a **change history** so “what was planned” vs “what is current” remains explainable.

**Why this priority**: Platform doc requires integration between planned and as-run reality; traceability starts here before match results exist in E4.

**Independent Test**: Create a schedule, move an entry’s start time, add an optional reason; verify the public/participant view shows the updated time and an authorized reviewer can see what changed and when.

**Acceptance Scenarios**:

1. **Given** an existing schedule entry, **When** the event’s **organizer** or a FAC administrator changes its scheduled time or venue label, **Then** the current schedule reflects the new values and a **schedule change record** captures prior value, new value, actor, timestamp, and optional reason.
2. **Given** multiple schedule changes, **When** a FAC administrator reviews the event schedule history, **Then** they see an ordered log sufficient to explain divergence from the original plan without developer-only tools.
3. **Given** a schedule entry marked **cancelled** or **delayed** with a reason (e.g. forfeit placeholder before E4 forfeit workflow), **When** participants refresh the schedule board, **Then** the entry status is visible and distinguishable from unchanged entries.
4. **Given** a schedule change, **When** it is saved, **Then** an audit entry is recorded per E1/E2 audit baseline extensions for schedule edits.

---

### User Story 6 - Registration visibility and organizer oversight (Priority: P3)

**Event organizers** (for **their** events) and **FAC administrators** review who is registered (fighters, staff roles), manage waitlists, and withdraw registrations when policy requires—without entering match results.

**Why this priority**: Operational clarity on event day depends on an authoritative participant list.

**Independent Test**: Register multiple fighters and a marshal; as the event’s organizer, filter registrations by type and status; withdraw one registration; confirm another organizer cannot manage this event’s registrations; confirm FAC admin can.

**Acceptance Scenarios**:

1. **Given** an event with registrations, **When** the event’s **organizer** or a FAC administrator opens the registration summary, **Then** they see counts and lists by registration type (fighter, staff role) and status (confirmed, waitlisted, withdrawn, cancelled), including optional team affiliation shown per fighter when recorded at registration.
2. **Given** a confirmed registration, **When** a FAC administrator withdraws it for policy reasons with a reason, **Then** status updates to withdrawn, capacity frees if applicable, and the action is audited.
3. **Given** a confirmed registration on an event, **When** the event’s **organizer** withdraws it per policy, **Then** the same outcome applies and the action is audited.
4. **Given** a registered fighter, **When** they view the event, **Then** they see their own registration status; they do not manage other fighters’ registrations.
5. **Given** registration is closed for an event, **When** a fighter attempts a new registration or self-withdrawal beyond policy, **Then** the action is blocked unless the event’s organizer or FAC admin reopens registration or performs an override.

---

### Edge Cases

- **Registration window**: Registrations outside open/close times are blocked; timezone for window boundaries follows the event timezone.
- **Event capacity**: Capacity is measured in **fighters** (competitor slots) unless FAC configures a separate staff cap; waitlist ordering is **first confirmed timestamp** unless FAC defines priority rules.
- **Team affiliation changes after registration**: If a fighter’s active team membership (E2) changes after they registered, the registration **remains valid**; stored affiliation at registration time is historical context only and does not auto-cancel the registration.
- **Deactivated user**: E1 disabled users cannot register; existing registrations show as invalid or withdrawn per policy.
- **Attendance confirmation**: If enabled, unconfirmed fighter registrations are withdrawn/cancelled at the confirmation deadline and capacity is freed; the system promotes from the waitlist where applicable and records the action in audit.
- **Duplicate registration**: Same fighter cannot be confirmed twice for the same event in the same competitor capacity; staff plus competitor registrations for the same user are allowed when policy permits.
- **Organizer reassignment**: FAC administrators MAY change an event’s organizer to another user with the **event organizer** operational role; the former organizer retains any existing fighter/marshal registrations but no longer manages the event.
- **Organizer scope**: Multiple users MAY hold the global **event organizer** role; each event has **one** organizer (creator by default, or assignee after FAC admin reassignment). Only that event’s organizer and FAC administrators may edit that event; holding the global role alone does not grant edit access to another user’s events.
- **Organizer multi-role**: An event’s organizer MAY register as **marshal** or **fighter** for that same event; registrations remain distinct and subject to the same capacity and eligibility rules.
- **Organizer abuse**: FAC administrators reassign the event organizer, revoke the global **event organizer** role, and/or cancel events; no separate approval queue before event creation in v1.
- **Sanctioning revoked**: If FAC revokes sanctioning before the event, status is visible; downstream ranking use is out of scope but event record remains archived.
- **Empty schedule on event day**: Organizers can still edit schedule; E4 match workflow is not required for schedule-only updates in this epic.

### Accessibility expectations (web)

Event creation, registration submission, schedule board viewing, schedule edit with change reason, and organizer registration summary MUST be **keyboard-operable** with **accessible names** on controls. Time-sensitive changes MUST not rely on **color alone** for status (confirmed, waitlisted, delayed, cancelled). Date/time displays MUST be perceivable by assistive technology (include timezone context in text, not hover-only).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST model **events** as records with lifecycle states at minimum: **draft**, **published**, **registration closed**, **in progress**, **completed**, and **cancelled**, plus **sanctioned** indicator controlled by FAC administrators.
- **FR-002**: The system MUST require event metadata at minimum: **name**, **start datetime**, **venue/location label**, and **timezone**; optional fields include end datetime, description, sanctioning notes, and registration capacity rules.
- **FR-003**: The system MUST support **registration windows** (open and close datetimes) enforced in the event timezone.
- **FR-003a**: If an event’s registration close instant is populated, the system MUST **automatically** transition the event to **registration closed** at that instant (interpreted/displayed in the event timezone, stored as a UTC instant).
- **FR-003b**: The event’s **organizer** and **FAC administrators** MUST be able to **manually close registration early** and MUST be able to **reopen registration** as an override path when policy allows; override actions MUST be audited.
- **FR-004**: The system MUST support **fighter self-registration** for all published events with open registration; **team captains MUST NOT** be required to approve or submit competitor registrations on behalf of fighters.
- **FR-005**: Fighter registration MUST NOT require **active team membership** (E2); unaffiliated fighters MUST be able to register when other event rules pass.
- **FR-006**: The system MAY **record optional team affiliation** at registration time (snapshot of the fighter’s active team membership if any) for operational and reporting context; affiliation snapshot MUST NOT gate registration and MUST NOT require captain action.
- **FR-006a**: The event’s **organizer** and **FAC administrators** MUST be able to register or withdraw fighters on their behalf with audit (override path only; not the default self-serve flow). Other users holding the global organizer role but not assigned to that event MUST NOT.
- **FR-007**: The system MUST support **staff role registrations** (e.g. marshal) for an event, distinct from competitor registrations, linked to E1 operational roles.
- **FR-008**: The system MUST enforce **capacity rules** per event configuration, supporting **confirmed** and **waitlisted** outcomes and promoting waitlisted entries when capacity frees in FIFO order.
- **FR-008a (v1)**: Waitlist ordering and promotion MUST be **FIFO** (first waitlisted timestamp). No priority rules are supported in v1.
- **FR-008b (extensibility)**: The waitlist promotion policy SHOULD be implemented behind a swappable interface so FAC can introduce alternative policies later without rewriting registration flows.
- **FR-009**: The system MUST expose an **event list** of published upcoming events to **authenticated** users; optional public read of basic event metadata may be enabled per Assumptions.
- **FR-010**: **Event organizer** MUST be an E1 **operational role** that **multiple users** MAY hold concurrently; only **FAC administrators** assign or revoke it (no self-grant).
- **FR-010a**: Users with the event organizer role MUST be able to **create events** without per-event FAC approval; the **creating user** becomes that event’s **sole organizer**.
- **FR-010b**: Each event MUST have **exactly one** organizer; only that event’s organizer and **FAC administrators** MAY edit, publish, cancel, or manage schedule and registration oversight for that event.
- **FR-010c**: **FAC administrators** MUST be able to **reassign** an event’s organizer to another user who holds the **event organizer** operational role, with audit capturing prior organizer, new organizer, actor, and timestamp.
- **FR-010d**: **FAC administrators** MUST be able to address abuse by revoking a user’s event organizer role globally, cancelling any event, and performing any organizer action on any event, with audit.
- **FR-010e**: A user who is an event’s organizer MUST NOT be blocked from **fighter** or **marshal** (staff) self-registration for that same event when otherwise eligible.
- **FR-011**: The system MUST model **schedule entries** belonging to an event with at minimum: label, scheduled start time, optional duration/end, status (e.g. planned, delayed, cancelled), and optional links to registrations or placeholder slots for future match binding (E4).
- **FR-012**: The system MUST maintain a **schedule change log** for edits to schedule entries capturing actor, timestamp, field changed, prior and new values, and optional reason.
- **FR-013**: Registered participants MUST be able to view the **current planned schedule** for events they are registered for; the event’s **organizer** and FAC administrators MUST see full registration and schedule management views for that event.
- **FR-014**: The system MUST extend the E1 **audit log** for event and registration events at minimum: event created/updated/published/cancelled/sanctioned; **event organizer reassigned**; fighter registration submitted/confirmed/waitlisted/withdrawn; staff registration submitted/withdrawn; schedule entry created/updated/cancelled; denied unauthorized registration or edit attempts.
- **FR-015**: The system MUST NOT implement match lifecycle, result entry, bracket progression logic, or standings (deferred to E4–E5).
- **FR-016**: Registration and schedule identifiers MUST remain stable for downstream epics to attach match records and results without re-keying participants.
- **FR-017**: The system MUST support an optional **pre-event attendance confirmation** requirement for fighter registrations, configurable per event by the event organizer (or FAC administrators).
- **FR-018**: When pre-event attendance confirmation is enabled for an event, fighters MUST be able to explicitly **confirm attendance** before the configured deadline; registrations that do not confirm by that deadline MUST be withdrawn/cancelled per event policy, freeing capacity and promoting waitlisted registrations per FIFO rules.

### Key Entities

- **Event**: Dated sanctioned occurrence; metadata; timezone; lifecycle and sanctioning state; registration window and capacity rules; **exactly one organizer** (typically the creator; FAC admin may reassign). An event’s competition scope may be described in prose until E4 models structured fight/match types.
- **Event registration**: Links an event to a registrant—**fighter** (competitor) or **staff role holder**—with status and timestamps; fighter registrations MAY include an optional **team affiliation snapshot** at registration time.
- **Schedule entry**: Planned time slot or segment on an event schedule; optional participant placeholders.
- **Schedule change record**: Historical row describing a schedule edit for traceability.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance testing, **100%** of eligible fighter self-registration attempts (including unaffiliated fighters) complete without any team captain approval step.
- **SC-002**: In acceptance testing, **100%** of duplicate fighter registration attempts for the same event are blocked with an understandable message.
- **SC-003**: For **10** schedule time changes performed by organizers, **100%** produce a retrievable change log entry with actor and timestamp visible to FAC admin without developer tools.
- **SC-004**: A documented script covers publish event → fighter self-register → marshal staff register → view schedule in under **15 minutes** for a new tester.
- **SC-005**: **95%** of authenticated test users locate a published upcoming event and their registration status within **2 minutes** in moderated usability checks (no match/result features required).

### Verification expectations

Automated tests SHOULD cover fighter self-registration (affiliated and unaffiliated), duplicate denial, capacity and waitlist behavior, staff registration separation, schedule change logging, and FAC admin organizer reassignment. Manual script retained for organizer publish flow and sanctioning.

## Assumptions

- **E1 and E2 complete**: users, operational roles, fighter profiles, teams, active roster membership, and audit baseline exist. E2 team/roster rules apply to **team governance**, not event registration gates in E3.
- **Timezone default**: Events store an explicit IANA timezone (default **`America/New_York`**) and all schedule/registration window times are interpreted and displayed in the event timezone; timestamps are persisted as UTC instants.
- **Event organizer** (global role): E1 operational role; **multiple users** may hold it at once; assigned only by FAC administrators. Holders may **create events freely** without per-event approval.
- **Event organizer** (per event): Each event has **one** organizer—the creator by default. **FAC administrators** may **reassign** organizer to another user who holds the global event organizer role; reassignment is audited. Only the current event organizer and FAC administrators may manage that event’s metadata, schedule, and registration oversight.
- **Multi-role organizers**: Users who are an event’s organizer **may also** register as **fighter** and/or **marshal** for that same event; global operational roles and per-event registrations remain distinct.
- **Fighter self-registration** applies to **all events** regardless of format label (5v5, 3v3, duel, etc.); format describes competition structure for scheduling and later match logic (E4), not who may submit a registration.
- **Team captains** have **no registration approval role** in E3; captains may still use E2 roster tools independently of event signup.
- **Capacity**: Default capacity counts **fighter competitor slots** per event; separate staff caps optional.
- **Registration approval**: Default is **automatic confirmation** when eligibility and capacity pass; FAC admin/organizer **withdrawal** covers manual rejection cases; explicit organizer approval queue deferred unless FAC requests it in `/speckit-clarify`.
- **Attendance confirmation (fighters)**: Event organizers MAY require fighters to confirm attendance a configured number of days before the event. This is separate from initial registration submission and is intended to reduce no-shows.
- **Public event pages**: Default **authenticated-only** discovery; basic public read (name, date, venue) optional per FAC policy and aligned with platform open decision §9—does not block E3 delivery.
- **Schedule entries** in E3 are **planned** slots only; attaching live match state and results is E4.
- **Forfeits and delays** on event day update schedule entry **status** and change log; full forfeit **match** outcomes are E4.
- **Notifications** (email/SMS) for registration confirmation or schedule changes are out of scope; in-app visibility only in v1.
- **Offline venue capture** deferred per platform doc §9 (E4 sub-program if required).

## Dependencies

- **E1**: identity, roles (`fac_admin`, `organizer`, `marshal`, `fighter`, etc.), audit log, user lifecycle.
- **E2**: teams and roster state (informational at registration time only; not a registration gate).
- FAC policy inputs: format catalog, default capacity rules, public vs authenticated event visibility.

## Out of scope (this epic)

- Match lifecycle, lineups, substitutions, bracket engine, result entry, corrections, and disputes (Epic E4).
- Standings, rankings, career aggregates, and public results surfaces (Epic E5).
- Reporting exports and results packets (Epic E6).
- Media, recaps, and notification channels (Epic E7).
- Payment, ticketing, medical credential enforcement, and equipment certification gates (unless FAC supplies concrete rules in clarify—otherwise defer).
- Event templates library and cloning (optional enhancement; not required for E3 MVP).
- **Guest accounts** (unauthenticated or limited-access participation without a full user account) — future epic; all actors in E3 require authenticated accounts per E1.
