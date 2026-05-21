# Feature Specification: Foundation — Identity, Roles & Audit (Epic E1)

**Feature Branch**: `001-foundation-identity-roles`

**Created**: 2026-05-13

**Status**: Draft

**Input**: User description: "Epic E1 from suggested-epics: foundation for FAC-App — actors identified in the system, canonical fighter identity and profile baseline, roles, and audit trail for later epics. Decisions: (Q1) fighters self-register; staff roles provisioned by FAC admin only — no open self-service elevation. (Q2) hybrid users — many staff are fighters; some staff are not; injured or non-competing fighters may hold operational roles (e.g. marshal, squire) while keeping a fighter profile. (Q3) fighter-facing profile is predominantly public for community discovery; selective hiding of specific elements must be supported. (Q4) defer credential/document vault and automated duplicate-profile merge — handled manually offline until future specs. (Q5) adults only for v1 — no minor-specific flows or guardian records."

**Refinement** (2026-05-13): `/speckit-specify` — clarify admin **direct create vs email invitation**, spell out **password reset completion** (not only “forgot password”), and tighten **SC-001** / **SC-004** so outcomes stay measurable without implying undocumented training clocks.

**References**: [docs/suggested-epics.md](../../docs/suggested-epics.md) (E1), [docs/platform-architecture-and-needs.md](../../docs/platform-architecture-and-needs.md) (sections 5.1, 5.7, and 6).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fighter self-registration and sign-in (Priority: P1)

A prospective **fighter** (adult) creates their own account without FAC staff involvement, confirms they meet FAC’s **adults-only** rule for this release, and can sign in again later using the credentials they established.

**Why this priority**: Without self-serve fighter onboarding, FAC cannot scale registration; every downstream epic assumes identifiable fighters.

**Independent Test**: A tester can complete registration as a new fighter, sign out, sign in, request password recovery for a forgotten password, complete the reset flow where applicable, and reach an authenticated home or profile entry point without any team or event features existing.

**Acceptance Scenarios**:

1. **Given** no prior account for the fighter’s contact identifier, **When** they complete the fighter registration flow including adult attestation, **Then** they receive an account and an associated **fighter profile shell** ready for details in Story 2.
2. **Given** a registered fighter, **When** they submit valid sign-in credentials, **Then** they access their authenticated session.
3. **Given** a person who cannot honestly attest adult status, **When** they attempt registration as a fighter, **Then** registration is refused with a clear explanation that v1 is adults-only.
4. **Given** a registered fighter who has forgotten their password, **When** they submit the **forgot password** request with their contact identifier, **Then** the product follows the agreed recovery path (e.g. time-limited reset link or staff-assisted reset per FAC policy) without leaking whether the identifier exists, and **When** they complete a valid reset, **Then** they can sign in with the new credentials.

---

### User Story 2 - Fighter profile and public discovery (Priority: P2)

A fighter completes **FAC’s minimum profile fields** and controls which optional elements appear on their **public fighter page** so the community can get to know them while sensitive items can stay hidden.

**Why this priority**: Public fighter discovery is a stated product goal; visibility controls reduce risk if something should not be broadcast.

**Independent Test**: With Story 1 done, a tester edits profile fields, toggles visibility for at least one optional element, and verifies both authenticated and anonymous views behave as expected.

**Acceptance Scenarios**:

1. **Given** an authenticated fighter, **When** they save required profile fields, **Then** the profile is considered **complete per FAC minimum policy** and eligible for full public display rules.
2. **Given** a fighter with a complete profile, **When** an anonymous visitor opens the fighter’s public page, **Then** the visitor sees all fields designated **public by default** and any optional fields the fighter chose to show.
3. **Given** a fighter who marks specific optional elements as hidden from public view, **When** an anonymous visitor opens the public page, **Then** those elements are not shown while still visible to the fighter and to **FAC administrators** when viewing that fighter’s full profile through FAC-admin tools (other operational roles without admin privileges MUST NOT see those hidden elements in v1).

---

### User Story 3 - FAC admin provisions staff and operational roles (Priority: P3)

A **FAC administrator** provisions accounts for **non-fighter staff** and **fighter-staff** (e.g. injured fighter acting as marshal or squire) using **direct account creation** and/or **email invitation** per FAC policy (see Assumptions), then assigns **operational roles** (marshal, squire, event organizer, FAC admin, etc.) without allowing the public to self-assign those roles.

**Why this priority**: Governance and safety depend on trusted roles; self-registration must not grant privileged capabilities.

**Independent Test**: With Story 1, create a fighter user and a separate staff-only user; as FAC admin, assign marshal to the fighter and assign organizer to the staff-only user; confirm neither user could grant those roles to themselves.

**Acceptance Scenarios**:

1. **Given** a FAC administrator, **When** they provision a new user who will never hold a fighter profile (e.g. pure organizer), **Then** that user can sign in and perform actions allowed for their assigned roles but has **no** fighter public page unless a fighter profile is later added.
2. **Given** a user who already has a fighter profile, **When** a FAC administrator assigns an operational role such as marshal or squire, **Then** the user retains their fighter identity and public page while gaining capabilities tied to the new role.
3. **Given** any authenticated user without FAC admin privileges, **When** they attempt to assign or elevate privileged roles, **Then** the action is denied and recorded per audit requirements.
4. **Given** a FAC administrator is about to **revoke** an operational role from a user, **When** they review a concise summary of the impact and confirm the irreversible action, **Then** the revocation proceeds (subject to FR-013) and the audit trail captures the change as in Story 4.
5. **Given** a FAC administrator is about to **deactivate** a user account, **When** they confirm after an explicit warning (e.g. loss of access, visibility to affected user), **Then** deactivation proceeds (subject to FR-013) and the audit trail captures the lifecycle event.
6. **Given** a FAC administrator views a user who has a fighter profile, **When** they open the FAC-admin full profile view for that user, **Then** they see the same class of profile detail as the owner sees (including elements hidden from the public page), read-only unless separate edit flows exist.

---

### User Story 4 - Audit trail for sensitive actions (Priority: P4)

FAC leadership can answer **who changed what and when** for identity, role, and public-visibility decisions that affect trust or safety.

**Why this priority**: Competitive integrity and volunteer turnover require attributable history; this epic establishes the baseline before matches and results exist.

**Independent Test**: Perform role assignment and a public-visibility change; a reviewer (FAC admin or auditor persona) retrieves a chronological explanation sufficient for an inquiry without developer-only tools.

**Acceptance Scenarios**:

1. **Given** a role assignment or revocation by a FAC administrator, **When** the change completes, **Then** an audit entry records actor, target user, prior role state, new role state, and timestamp.
2. **Given** a fighter changes public visibility of a profile element, **When** the change saves, **Then** an audit entry records actor, affected field or grouping, prior visibility, new visibility, and timestamp.
3. **Given** account lifecycle events that this epic covers (fighter self-registration completion; FAC administrator creation or deactivation of a user account), **When** a FAC administrator reviews that user’s history, **Then** each such event appears in the audit trail with actor, target, summary, and timestamp.

---

### Edge Cases

- **Duplicate person, separate accounts**: No automated merge in this epic; FAC may resolve offline. The system SHOULD avoid obvious duplicate contact reuse per uniqueness rules without implementing merge.
- **Last FAC administrator**: Demoting or deactivating the sole remaining FAC administrator MUST be blocked per **FR-013** until another FAC administrator exists.
- **Fighter hides all optional public fields**: Public page still shows **FAC-mandated minimum public facts** (e.g. display name or ring name policy — exact list in Assumptions) so the page cannot become an empty shell.
- **Staff user later becomes a fighter**: FAC admin or the user flows allowed by policy can add a fighter profile to an existing staff-only account without creating a second identity.
- **Revoked role while user is signed in**: Permission checks for privileged actions MUST reflect **current** role assignments (authoritative store or refreshed claims). The user sees an understandable message if they attempt a newly disallowed action; requiring a fresh sign-in is acceptable only if explicitly documented in delivery notes and does not leave stale privileged access in place.

### Accessibility expectations (web)

Primary flows (fighter registration and sign-in, password recovery, profile edit, public fighter page, FAC admin user/role management, audit review) MUST be **keyboard-operable** with a **predictable focus order**. Interactive controls MUST have **accessible names** available to assistive technologies. Text and essential controls MUST meet **WCAG 2.1 Level AA** contrast for normal-sized content unless FAC approves a documented exception. Important states (errors, success, blocking rules such as last-admin) MUST not rely on **color alone** and MUST be perceivable by assistive technology users.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow **adult fighters** to self-register for an account with an associated fighter profile, including an **explicit adult attestation** consistent with v1 adults-only scope.
- **FR-002**: The system MUST allow registered fighters to **sign in** and **sign out** using credentials established at registration. For **lost access**, the system MUST provide (a) a **recovery request** step that uses the fighter’s registered contact and does **not** reveal whether that contact belongs to an account, and (b) a **reset completion** step using a **time-limited proof** (for example a link or code delivered to that contact) so the fighter can set **new** credentials and sign in successfully, consistent with User Story 1 acceptance scenarios.
- **FR-003**: The system MUST enforce **FAC-defined minimum profile fields** for fighters and indicate clearly which fields are incomplete until satisfied.
- **FR-004**: The system MUST expose a **public fighter page** for each fighter with a complete minimum profile, readable **without authentication**, showing all profile elements that are **public by default** or explicitly opted in by the fighter.
- **FR-005**: The system MUST let fighters mark **eligible optional profile elements** as hidden from public view while those elements remain visible to the fighter and to **FAC administrators** in v1, including when an administrator views **another** user’s fighter profile through FAC-admin tools (anonymous viewers and authenticated users who are **not** FAC administrators MUST NOT see those hidden elements).
- **FR-006**: The system MUST prevent registration flows from granting **privileged operational roles**; default self-registered role is **fighter-only** (or equivalent least-privilege label).
- **FR-007**: FAC administrators MUST be able to **provision** user accounts for people who are not onboarded through fighter self-registration: **either** by **creating an account that can sign in** under FAC’s chosen credential policy (for example FAC-supplied initial password communicated out of band), **or** by **inviting** the person so they complete enrollment (for example set their own password from an invitation message) before operational roles apply as policy allows. Administrators MUST assign or revoke **operational roles** (including FAC admin, organizer, marshal, squire, and other labels FAC maintains in a controlled list). The public MUST NOT be able to grant themselves privileged operational roles through these flows.
- **FR-008**: The system MUST support users who **hold operational roles without a fighter profile** and users who **hold both a fighter profile and operational roles** simultaneously.
- **FR-009**: The system MUST maintain an **audit log** capturing, at minimum: role assignments and revocations; **denied** attempts (via exposed controls or APIs) by non-privileged users to assign, elevate, or grant privileged operational roles where the product surfaces such an action; fighter profile visibility changes; and FAC administrator actions that create or deactivate user accounts — each with actor, target (where applicable), before/after or denial summary, and timestamp.
- **FR-010**: The system MUST reject attempts by non-administrators to assign, elevate, or grant privileged operational roles to themselves or others. **Administrator impersonation** (signing in or acting inside the product as another user’s identity) is **out of scope for v1** and MUST NOT ship; FR-010 does not require building impersonation in order to “reject” it, but any future impersonation-like capability would require its own specification and constitution review.
- **FR-011**: The system MUST NOT implement **document or credential vault** (medical, armor inspection, waivers) or **automated duplicate-fighter merge** in this epic; duplicates are handled per FAC offline process.
- **FR-012**: The system MUST NOT solicit or store **minor-specific** or **guardian** records in this epic; registration MUST be limited to adults per FAC v1 policy.
- **FR-013**: The system MUST prevent removal of the **last** FAC administrator role or deactivation of the **sole remaining** FAC administrator account without first establishing another user with FAC administrator authority (clear blocking message to the actor).

### Key Entities *(include if feature involves data)*

- **User account**: Sign-in identity, lifecycle state (active, disabled), linkage to zero or one fighter profiles and zero or more operational roles.
- **Fighter profile**: Public-facing and internal fields, completion state against FAC minimums, visibility choices per hideable element or grouping.
- **Operational role assignment**: Mapping between a user and a FAC-controlled role label, effective period if needed, assigned only through FAC administrator action in v1.
- **Audit event**: Append-only record of sensitive changes with enough structured detail to support investigations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least **90%** of participants who execute a **published first-run task script** (the same steps a new fighter would follow) complete **fighter self-registration and first sign-in** within **15 minutes** without needing to abandon or skip steps because of product defects (excluding delays outside the product, such as waiting for an external message). **Evidence**: outcomes from a **moderated usability session** **or** an **equivalent** recorded task-run review against the same script — method and participant count documented with the release.
- **SC-002**: **100%** of attempted **self-grants** of privileged operational roles in automated negative testing are denied and produce an audit entry where applicable.
- **SC-003**: For a sample set of **10** profile visibility toggles performed by fighters, anonymous viewers see the **correct** public vs hidden state in **100%** of cases on a subsequent visit after each change is saved.
- **SC-004**: In **acceptance testing** with a **prepared scenario checklist** (given role changes and visibility changes for known test users), FAC administrators (or trained delegates following the release admin guide) open the correct user’s **chronological audit trail** and confirm the expected events are present in **at least 95%** of runs **without engineering support** to interpret raw data.
- **SC-005**: **Zero** registered fighter profiles in v1 include fields or flows that imply **minor or guardian** relationships (verified by requirements traceability in acceptance review).

### Verification expectations

Epic delivery MUST retain **evidence** traceable to user stories and SC-001–SC-004: documented manual test scripts with expected results, **and/or** automated checks, recorded in a way reviewers can inspect (for example in the repository or linked release notes). **SC-001** may be satisfied by moderated sessions **or** equivalent documented task-run review, as long as the task script and results are retained. Accessibility expectations in this spec MUST be covered by at least one **manual or automated** accessibility pass on the listed primary flows before release.

## Assumptions

- **Adults-only v1**: “Adult” is **18+** unless FAC publishes a different legal threshold; attestation is self-declaration aligned with nonprofit practice, not legal identity verification unless separately specified later.
- **Minimum public fighter facts**: Even when optional fields are hidden, the public page shows at least **display name (or ring name)** and a neutral state for “no additional public details” — exact minimum list is FAC-configurable but MUST be non-empty for a complete profile.
- **Contact uniqueness**: One account per primary contact identifier (e.g. email) to reduce casual duplicates; resolving same person with two accounts remains a **manual** process in v1.
- **No payments**: Access is never sold; “free platform” from the platform architecture document remains true.
- **Later epics**: Team rosters, events, matches, standings, exports, and full compliance program are **out of scope** except where this epic must not block them (stable user and fighter identifiers).
- **Admin provisioning**: FAC may use **only direct creation**, **only invitation**, or **both** for staff accounts in v1; the product MUST support the modes FAC selects. FAC policy defines how initial credentials or invitations are communicated outside the product.
- **Password reset**: Self-serve reset relies on a **time-limited proof** tied to the registered contact; used proofs MUST NOT remain valid for repeat account takeover.

## Dependencies

- None internal (first epic). Depends on FAC policy inputs: minimum profile field list, operational role labels, which profile elements are hideable, and **which staff provisioning mode(s)** are used in v1 (**direct_active**, **email_invitation**, or both).

## Out of scope (this epic)

- Team and roster management (Epic E2).
- Events, registration, matches, results, standings, public standings surfaces beyond **per-fighter public page** (Epics E3–E5).
- Credential/document storage and expiry reminders.
- Automated duplicate profile merge workflow.
- Minor fighters, guardian consent, and youth-specific privacy modes.
- **Administrator impersonation** (“sign in as user” or equivalent): not in v1; all privileged actions are performed under the **administrator’s own** authenticated identity.
