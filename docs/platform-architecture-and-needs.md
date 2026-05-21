# FAC Platform — Architecture & Needs (Product Level)

**Audience**: FAC leadership, product owners, and anyone writing Spec Kit feature specs.  
**Intent**: Describe **what** the platform must accomplish and **why**, at a level that can be sliced into independent feature specifications.  
**Out of scope for this document**: visual design, technology choices, database schemas, and implementation detail.

**How to use with Spec Kit**: Treat each major section under [Capability areas](#capability-areas) as a candidate **theme**; use **[suggested-epics.md](./suggested-epics.md)** for **one feature spec per epic** (dependency order and epic boundaries). Each bullet under a capability remains a candidate **smaller feature** inside or across epics once you add acceptance scenarios, roles, and data rules.

---

## 1. Context

### 1.1 What FAC is

FAC is a nonprofit organization that supports and administers **Buhurt** fighters and teams. Buhurt is a full-contact combat sport with structured competition, team formats, events, and formal records that matter to athletes, coaches, officials, and the public.

**Commercial model**: FAC-App is **entirely free** to the community. There are **no paid memberships**, subscriptions, or paywalled tiers for core competition data and workflows. Access is about **roles and eligibility** (who may see or edit what for governance and safety), not about purchasing access.

### 1.2 Why a dedicated platform

Combat sports organizations routinely need a **single source of truth** for who is active, who belongs to which team, what happened at which event, and how results aggregate into standings and histories. Spreadsheets, chat threads, and ad hoc documents do not scale: they diverge, lose auditability, and make fair governance harder.

FAC-App exists to:

- Reduce administrative burden on volunteers and staff.
- Improve **accuracy and timeliness** of rosters, results, and statistics.
- Support **transparent** operations appropriate to a nonprofit serving a competitive community.
- Preserve **history**: careers, team lineage, and event archives should remain accessible as the organization grows.

---

## 2. Goals and success criteria (non-technical)

### 2.1 Primary goals

1. **Operational clarity**: Any authorized user can answer, without private knowledge, who fights for whom, whether **fighter registration and eligibility** are current, and what the official outcome of a match or event was.
2. **Competitive integrity**: Results and records are attributable, revisable only through defined processes, and consistent everywhere they appear.
3. **Community trust**: Public-facing information (where FAC chooses to publish it) is coherent with internal records.
4. **Sustainability**: The model of the sport and FAC’s rules can evolve without forcing a rewrite of unrelated areas (for example, **standings logic** should not be entangled with **media or comms** features until you explicitly choose to combine them).

### 2.2 Measurable directions (to refine per feature)

Examples of outcomes future specs can quantify:

- Time to publish official results after an event ends.
- Error rate on roster mismatches at check-in.
- Fraction of fighter profiles complete against FAC’s minimum data policy.
- Support load: repeated questions that disappear once data is authoritative in the app.

---

## 3. Stakeholders and roles (conceptual)

These are **personas and responsibilities**, not system permissions yet. Feature specs should map real permissions onto subsets of this list.

| Stakeholder | Needs (summary) |
|---------------|------------------|
| **Fighter** | Profile accuracy, team affiliation, personal competitive history, clarity on eligibility and status. |
| **Team captain / coach** | Roster management, event registration, lineups where applicable, communication hooks (future). |
| **Event organizer** | Event definitions, brackets or match structures (as the sport requires), scheduling, results capture, incident or disciplinary flags if FAC tracks them. |
| **Officials / marshals** | Authoritative match states, notes tied to matches or fighters if policy allows, minimal friction during events. |
| **FAC administrators** | Governance, policy enforcement, corrections, archival, exports, and audit visibility. |
| **Public / fans / sponsors** | Read-only access to sanctioned results and stories FAC chooses to expose (scope is a product decision). |

**Design implication**: The platform is multi-tenant in *meaning* (many teams, many events) but single **authority** (FAC) over what counts as official.

---

## 4. Domain concepts (language FAC should standardize)

Feature specs will be easier if FAC locks terms early. The list below is a **starting glossary**; adjust to your rulebook.

- **Fighter**: A person who competes under FAC’s rules, with identity, status, and history.
- **Team**: A persistent competitive unit that fighters belong to; may have seasons, divisions, or national chapters depending on FAC structure.
- **Registration & affiliation**: How a fighter is known to FAC (account/profile, **good standing**, suspensions) and how they **belong to a team** over time—possibly with eligibility constraints (age class, weight, equipment certification, medical clearance—only include what FAC actually tracks). This is **not** a paid membership product; it is operational status and relationships.
- **Event**: A dated occurrence (tournament, league meet, exhibition) with location, format, and officials.
- **Match / bout**: A unit of competition within an event, with participants, outcome, and metadata (rounds, stoppages, forfeit, etc.—sport-specific).
- **Record & statistics**: Derived facts from official results (wins/losses, placements, sport-specific stats). Some stats are **computed**, some may be **curated** if the sport uses subjective scoring.
- **Sanctioning**: FAC’s assertion that an event or result is official for ranking or record purposes.

Anything FAC tracks outside pure competition—**fundraising, volunteer hours, equipment loans, travel logistics**—should be explicitly scoped in or out per epic to avoid scope creep.

---

## 5. Capability areas

Each area below states **why it matters** and **what “done” means** at a product level. Decompose into specs by picking bounded workflows (e.g. “team captain invites fighter” vs “public leaderboard”).

### 5.1 Identity, profiles, and lifecycle

**Why**: Combat sports are sensitive to mistaken identity, duplicated profiles, and outdated medical or eligibility documents.

**Needs**:

- Canonical fighter identity with merge/split rules for duplicates (policy, not only tooling).
- Profile fields driven by FAC policy: what is mandatory vs optional, what is public vs internal.
- Status lifecycle: active, suspended, retired, provisional, guest competitor—align with your bylaws.
- Document or credential tracking **if** FAC requires it (medical, armor inspection, waivers).

**Candidate feature specs**: profile schema governance; duplicate detection workflow; privacy tiers; document expiry reminders.

### 5.2 Teams, rosters, and affiliations

**Why**: Team sport administration is roster-first. Errors here propagate to events and standings.

**Needs**:

- Team records: leadership contacts, home region, competitive tier or division.
- Historical affiliation: a fighter’s timeline of teams for accurate career stats.
- Roster rules: max roster size, transfer windows, dual-affiliation prohibitions—encode only what FAC enforces.

**Candidate feature specs**: team CRUD; invitation and acceptance flows; transfer requests; read-only public roster pages (optional).

### 5.3 Events, formats, and scheduling

**Why**: Events are the anchor for matches, staffing, and publishing.

**Needs**:

- Event metadata: sanctioning level, format (5v5, 3v3, duels, etc.), schedule, venue, timezone correctness.
- Capacity and registration rules if fighters or teams self-register.
- Integration between **planned** schedule and **as-run** reality (delays, forfeits).

**Candidate feature specs**: event creation templates; registration; schedule board; change log for schedule edits.

### 5.4 Matches, results, and officiating workflow

**Why**: This is the trust surface of the whole platform.

**Needs**:

- Match lifecycle: scheduled → in progress → official → corrected (with reason and authority).
- Support for Buhurt-specific structures (team lineups, substitutions if allowed, bracket progression).
- Official attribution: which roles may enter or lock results.
- Dispute handling: contested outcomes, protests, or administrative reversals—at minimum an audit trail.

**Candidate feature specs**: match sheet; permissions matrix for result entry; correction workflow; protest log (if used).

### 5.5 Standings, rankings, records, and statistics

**Why**: Athletes and teams care about progression; FAC may publish rankings for transparency.

**Needs**:

- Clear separation between **raw official results** and **derived** standings or Elo-like ratings if FAC uses them.
- Versioning or snapshots if rankings are time-sensitive (e.g. “rankings as of date X”).
- Historical preservation when rules change (how past seasons are interpreted).

**Candidate feature specs**: ranking engine configuration; public standings pages; fighter career page; team aggregate stats.

### 5.6 Media, storytelling, and visibility (optional epic)

**Why**: Nonprofits grow engagement through narrative, not only tables.

**Needs** (only if FAC wants them in-scope):

- Linking photos or recap articles to events and fighters.
- Consent and image rights tied to fighter profiles.

**Candidate feature specs**: media attachments; consent flags; public event recap.

### 5.7 Governance, audit, and compliance

**Why**: Volunteers change; disputes happen; funders and the community expect accountability.

**Needs**:

- Audit log for changes to official results, roster eligibility, and administrative overrides.
- Data retention and deletion aligned with nonprofit duties and applicable privacy law (jurisdiction-specific; decide in spec).
- Role-based access aligned to least privilege.

**Candidate feature specs**: audit export; admin impersonation policy (if any); GDPR-style subject access (if applicable).

### 5.8 Reporting and exports

**Why**: FAC will still use email, board decks, and possibly national/international federation reporting.

**Needs**:

- Standard exports: event results book, roster CSV, and other competition or governance packs FAC defines (no payment or donor accounting in this product scope unless the doc is amended).
- Scheduled or self-serve reporting for recurring needs.

**Candidate feature specs**: CSV/PDF export packs; “official results packet” for an event.

### 5.9 Notifications and communications (likely later)

**Why**: Reduce no-shows and speed corrections.

**Needs** at product level only: identify **which events** trigger messages (roster change, match time shift). Actual channels (email, SMS, push) belong in implementation specs.

---

## 6. Cross-cutting quality attributes

These should appear as non-functional requirements in relevant specs:

- **Integrity**: Official data cannot silently change; corrections are visible.
- **Availability during events**: Event day usage spikes; downtime is costly.
- **Privacy**: health data, minors, and contact info require stricter handling than public fight records.
- **Accessibility**: if there is a public web surface, plan for inclusive access in feature specs.
- **Internationalization**: if FAC operates across languages or regions, capture early in data model decisions (names, date formats).

---

## 7. Explicit non-goals (initial suggestions — edit with FAC)

Declaring non-goals prevents Spec Kit churn.

Examples FAC may choose to exclude from v1:

- Paid access, subscriptions, or “premium” tiers (aligned with **entirely free** platform scope).
- Full accounting and payroll.
- Ticketing and merchandise unless tightly coupled to events.
- Live video streaming infrastructure.
- Arbitrary custom scoring plugins without governance review.

Record decisions here as FAC aligns leadership.

---

## 8. Suggested epic map for Spec Kit

Epics are maintained as their own file so each can become a **separate** feature spec (no single monolith spec for the whole app). See **[suggested-epics.md](./suggested-epics.md)** for ordering, dependencies, per-epic scope hints, and spec naming ideas.

---

## 9. Open decisions (capture answers before deep specs)

Use Spec Kit `/speckit-clarify` or workshops to resolve:

1. **Public vs authenticated-only**: exactly which objects are public, which require a logged-in account (still free), and whether anonymous browsing is allowed.
2. **Youth and sensitive data**: are minors in scope; what is stored where.
3. **Federation alignment**: must FAC mirror external IDs or ranking systems.
4. **Offline / venue connectivity**: must officials record results without internet; if yes, that becomes a major epic.
5. **Money**: out of scope for this document—FAC-App is **not** a payments, dues, or fundraising system unless FAC later adopts a separate product decision and amends this doc.

---

## 10. Document maintenance

- **Owner**: FAC product/designate + technical lead.  
- **Cadence**: Revise when bylaws, weight classes, or event formats change materially.  
- **Versioning**: Bump a short revision note at the bottom when sections move from “hypothesis” to “FAC-approved.”

**Revision**: 0.3 — 2026-05-13 — Epic map moved to [suggested-epics.md](./suggested-epics.md) for one-spec-per-epic workflow.

**Prior**: 0.2 — free platform, no paid memberships, registration/affiliation wording, public vs authenticated access, money out of scope unless revised; 0.1 — initial outline.
