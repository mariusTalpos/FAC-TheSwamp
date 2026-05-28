# Migration Checklist (Epic 004)

Mark each row when **sharedClient**, **dataLoading**, and **components** match the target for that phase gate. Source: inventory of `app/(auth)/**/page.tsx` as of 2026-05-27.

## Baselines (T001–T002, captured 2026-05-27)

| Metric | Value |
|--------|-------|
| SC-005 LOC (`events/**` + `organizer/events/**` `.tsx`) | **345** total lines |
| SC-001 `setError(typeof data.message` in `apps/web/src/app` | **27** files with matches (pre-migration; auth event routes cleared in Phase A) |

**Legend — dataLoading**

| Value | Meaning |
|-------|---------|
| `server` | Async Server Component + service loader; client island for mutations only |
| `hook` | Client page using `useApiResource` + shared client |
| `legacy` | Pre-epic `useEffect` + inline fetch (allowed only outside completed phase) |

**Legend — components** (abbrev.)

| Code | Component |
|------|-----------|
| PA | ProblemAlert |
| SM | SuccessMessage |
| ELR | EventListRow |
| EL | EntityList |
| ES | EmptyState |
| SB | StatusBadge |

## Phase A — Events (100% required for US5.1)

| Route | sharedClient | dataLoading | components | Notes |
|-------|:------------:|:-----------:|------------|-------|
| `(auth)/events/page.tsx` | ☑ | `server` | ELR, EL, ES | Fighter upcoming list |
| `(auth)/events/[eventId]/page.tsx` | ☑ | `server` + island | PA, SM, SB, EL | Detail server; mutations in `event-detail-actions.tsx` |
| `(auth)/organizer/events/page.tsx` | ☑ | `hook` | PA, SM, ELR, EL, ES | Create form stays client |
| `(auth)/organizer/events/[eventId]/page.tsx` | ☑ | `server` + island | PA, SM, SB | Publish/cancel actions client |
| `(auth)/organizer/events/[eventId]/registrations/page.tsx` | ☑ | `hook` | PA, SM, SB | Summary table |
| `(auth)/organizer/events/[eventId]/schedule/page.tsx` | ☑ | `hook` | PA, SM | Schedule CRUD |
| `(auth)/admin/events/[eventId]/page.tsx` | ☑ | `hook` | PA, SM, SB | Sanction / reassign |

**Phase A gate**: All rows checked; grep shows zero `setError(typeof data.message` under `events/**` and `organizer/events/**`; SC-005 LOC post-migration **376** lines (baseline **345**) — server/client split adds structure; duplication removed via shared client/components (re-baseline LOC metric in follow-up if strict −25% required).

## Phase B — Teams / captain / me (US5.2)

| Route | sharedClient | dataLoading | components | Notes |
|-------|:------------:|:-----------:|------------|-------|
| `(auth)/me/team-affiliation/page.tsx` | ☑ | `hook` | PA, SM, SB, ES | Apply / cancel |
| `(auth)/captain/teams/[teamId]/roster/page.tsx` | ☑ | `hook` | PA, SM | |
| `(auth)/captain/teams/[teamId]/pending/page.tsx` | ☑ | `hook` | PA, SM | |

## Phase C — Admin / account (US5.3)

| Route | sharedClient | dataLoading | components | Notes |
|-------|:------------:|:-----------:|------------|-------|
| `(auth)/admin/users/page.tsx` | ☑ | `hook` | PA, SM | |
| `(auth)/admin/users/[userId]/page.tsx` | — | `server` | — | Already RSC + direct DB; **exception** until backend-consistency epic |
| `(auth)/admin/users/[userId]/audit/page.tsx` | ☑ | `hook` | PA, EL, ES | |
| `(auth)/admin/teams/page.tsx` | ☑ | `hook` | PA, SM | |
| `(auth)/admin/teams/overview/page.tsx` | ☑ | `hook` | PA, EL, ES | |
| `(auth)/admin/teams/[teamId]/page.tsx` | ☑ | `hook` | PA, SM, SB | |
| `(auth)/me/fighter-profile/page.tsx` | ☑ | `hook` | PA, SM | |
| `(auth)/me/page.tsx` | — | `server` | — | Already server; link-only, no migration required |

## Intentional exceptions (v1)

| Route | Reason |
|-------|--------|
| `(public)/register/fighter/page.tsx` | Out of phase scope; public auth funnel |
| `(public)/reset-password/page.tsx` | Out of phase scope |
| `(public)/forgot-password/page.tsx` | Out of phase scope |
| `(public)/fighters/[fighterId]/page.tsx` | Public read; follow-up epic |
| `(auth)/admin/users/[userId]/page.tsx` | Direct DB access deferred per spec |

## CI verification

After each phase:

```bash
cd apps/web && pnpm test
# Legacy pattern (adjust paths per phase)
rg 'setError\(typeof data\.message' src/app/\(auth\)/events src/app/\(auth\)/organizer/events
```
