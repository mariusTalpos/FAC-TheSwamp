# FAC-App — Suggested epics (Spec Kit entry points)

**Purpose**: Break FAC-App into **separate Spec Kit feature specs**—one primary spec per epic (or per epic slice you deliberately split). Avoid a single monolithic spec for the whole product.

**Parent context**: Product-level needs and capability areas live in [platform-architecture-and-needs.md](./platform-architecture-and-needs.md) (especially §5). This file only defines **delivery epics**, order, and handoffs.

**How to use**

1. Pick the next epic in dependency order (or parallelize only where noted).
2. Create a **new** `spec.md` (or Spec Kit equivalent) scoped to **that epic’s outcome**, with user scenarios and acceptance criteria that do not assume unspecified future epics.
3. Run plan/tasks against **that** spec only.
4. When an epic is large, split by **user-visible workflow** (e.g. “event creation” vs “event day schedule edits”), not by layer-only refactors.

---

## Dependency order (summary)

```text
E1 Foundation
   ↓
E2 Teams & rosters
   ↓
E3 Events & registration
   ↓
E4 Matches & results
   ↓
E5 Standings & public surfaces
   ↓
E6 Reporting & integrations

E7 Engagement — optional; can start after E1 (consent/privacy) for media; comms often after E4–E5

E8 Fighter birthdays — optional; after E1 (profile); may overlap E7 if notifications or surfacing
```

---

## Epic catalog

### E1 — Foundation

| Field | Content |
|--------|---------|
| **Depends on** | Nothing (first). |
| **Platform map** | §5.1 (identity, profiles, lifecycle); §5.7 in part (roles, least privilege, **audit basics**); §6 (cross-cutting NFRs as they apply). |
| **Outcome** | People can be identified as actors in the system; fighters have a canonical identity and profile baseline; roles exist; critical actions leave an **audit trail** sufficient for later epics to build on. |
| **In scope (typical)** | Auth model (free accounts), role definitions, fighter profile minimum, duplicate identity rules at high level, baseline audit events for admin and data changes. |
| **Out of scope (defer)** | Full compliance program, every export, full public site—those land in later epics unless blocking E2. |
| **Spec naming hint** | e.g. `spec-foundation-identity-roles.md` |

---

### E2 — Teams & rosters

| Field | Content |
|--------|---------|
| **Depends on** | E1 (fighter identity, roles). |
| **Platform map** | §5.2. |
| **Outcome** | Teams exist; fighters are placed on rosters with rules FAC enforces; historical team affiliation is visible for stats integrity. |
| **In scope (typical)** | Team records, roster add/remove, invitations, transfer rules you actually use, captain/coach permissions. |
| **Out of scope (defer)** | Event registration (E3), match lineups (E4) unless you intentionally merge for a thin MVP. |
| **Spec naming hint** | e.g. `spec-teams-rosters.md` |

---

### E3 — Events & registration

| Field | Content |
|--------|---------|
| **Depends on** | E2 (teams/rosters; may allow individual registration if your format supports it—call out in spec). |
| **Platform map** | §5.3. |
| **Outcome** | FAC can define sanctioned events; teams/fighters can register per rules; schedule exists and can diverge from plan with traceability. |
| **In scope (typical)** | Event metadata, formats, capacity, registration workflow, schedule board, change log for schedule. |
| **Out of scope (defer)** | Match engine, results, standings (E4–E5). |
| **Spec naming hint** | e.g. `spec-events-registration.md` |

---

### E4 — Matches & results

| Field | Content |
|--------|---------|
| **Depends on** | E3 (events; participants known). |
| **Platform map** | §5.4. |
| **Outcome** | Matches can be run and recorded; official results are attributable; corrections and disputes follow defined processes with auditability. |
| **In scope (typical)** | Match lifecycle, Buhurt structures you support (lineups, substitutions, brackets), permissions for enter/lock, correction workflow. |
| **Out of scope (defer)** | Derived standings and public career pages (E5) except minimal read-back of raw results for sanity checks. |
| **Spec naming hint** | e.g. `spec-matches-results-officiating.md` |

---

### E5 — Standings & public surfaces

| Field | Content |
|--------|---------|
| **Depends on** | E4 (official results as source of truth). |
| **Platform map** | §5.5; parts of §9 (public vs authenticated-only) resolved in spec. |
| **Outcome** | Rankings/standings/career views are **derived** from official data, versioned or explainable as rules change; any public FAC pages stay consistent with internal records. |
| **In scope (typical)** | Ranking/standings rules FAC chooses, fighter career page, team aggregates, public read models where approved. |
| **Out of scope (defer)** | Heavy reporting packs (E6), media (E7). |
| **Spec naming hint** | e.g. `spec-standings-public-surfaces.md` |

---

### E6 — Reporting & integrations

| Field | Content |
|--------|---------|
| **Depends on** | E4 at minimum; often E5 if exports include standings. E1 audit helps export credibility. |
| **Platform map** | §5.8; §5.7 remainder (retention, subject access, audit export) as needed; federation reporting in §9. |
| **Outcome** | FAC can pull official data out for board work, partner bodies, or archives on a repeatable basis. |
| **In scope (typical)** | CSV/PDF (or agreed formats), event results packet, roster exports, optional integration hooks **only if** you have a concrete counterparty in the spec. |
| **Out of scope (defer)** | Payments, fundraising CRM, arbitrary third-party marketplace. |
| **Spec naming hint** | e.g. `spec-reporting-exports.md` |

---

### E7 — Engagement (optional)

| Field | Content |
|--------|---------|
| **Depends on** | E1 for consent/privacy on profiles; E4/E5 if content ties to matches or standings. |
| **Platform map** | §5.6 (media, storytelling); §5.9 (notifications). |
| **Outcome** | Optional narrative and alerts that **do not** weaken trust in official results data. |
| **In scope (typical)** | Attachments, recaps, consent flags; notification triggers and templates (channel choice is implementation). |
| **Out of scope (defer)** | Anything that duplicates E4/E5 as source of truth. |
| **Spec naming hint** | e.g. `spec-engagement-media.md`, `spec-engagement-notifications.md` (two specs if you want smaller reviews). |

---

### E8 — Fighter birthdays

| Field | Content |
|--------|---------|
| **Depends on** | E1 (fighter profile baseline). Optional overlap with E7 if birthdays drive notifications or community surfacing. |
| **Platform map** | TBD — likely §5.1 (profile fields); §5.6 / §5.9 if engagement or alerts apply. |
| **Outcome** | TBD — FAC can capture fighter birth dates and use them in agreed workflows while respecting consent and visibility rules. |
| **In scope (typical)** | TBD — e.g. birth date on profile, privacy controls, who can see what, any FAC-facing birthday experiences. |
| **Out of scope (defer)** | TBD |
| **Spec naming hint** | e.g. `spec-fighter-birthdays.md` |

---

## Splitting epics without losing the map

- **Governance (§5.7)** spans E1 (roles, audit), E4 (result corrections), and E6 (exports, retention). Re-state only the slice each spec owns; link “see also” to sibling specs.
- **Public vs authenticated-only** should be decided once and referenced from E5 (and any E3/E4 UI that leaks visibility).
- If **offline event capture** (open decision in platform doc §9) is required, treat it as a **sub-program inside E4** with its own spec rather than inflating E1.

---

**Revision**: 0.2 — 2026-05-29 — Added E8 Fighter birthdays (skeleton).  
**Revision**: 0.1 — 2026-05-13 — Initial epic list split from platform architecture doc for per-epic Spec Kit specs.
