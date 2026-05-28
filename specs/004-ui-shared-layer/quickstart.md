# Quickstart (Epic 004 — UI Shared Layer)

Assumes **E1–E3** are running locally ([001 quickstart](../001-foundation-identity-roles/quickstart.md), [002](../002-teams-rosters/quickstart.md), [003](../003-events-registration/quickstart.md)).

## Prerequisites

- Branch `004-ui-shared-layer` checked out.
- Migrations and seeds from E3 applied (`pnpm db:migrate`, demo seeds optional).
- Dev stack running (`scripts/dev-web.sh` or VS Code tasks).

## Baseline (before Phase A)

Capture LOC for SC-005:

```bash
# From repo root — record output in PR / phase notes
wc -l apps/web/src/app/\(auth\)/events/**/*.tsx apps/web/src/app/\(auth\)/organizer/events/**/*.tsx
rg -c 'setError\(typeof data\.message' apps/web/src/app
```

## After shared client + components land

1. **Unit tests**

   ```bash
   cd apps/web && pnpm test tests/unit/api/client.test.ts
   ```

2. **Error parsing parity (US1)**  
   - Sign in as `fighter@fac.test`.  
   - Open a published event with registration **closed** → register → expect `ProblemAlert` with server message (same text if triggered from organizer withdraw denial on another screen).

3. **Shared list row (US2)**  
   - As fighter: `/events` — note list row layout.  
   - As `organizer@fac.test`: `/organizer/events` — rows MUST use same `EventListRow` component (inspect React devtools or DOM structure).  
   - Change event to `draft` on organizer detail — `StatusBadge` on fighter vs organizer detail MUST match label for same status.

## After Phase A (server-first lists)

4. **No-JS first paint (US4)**  
   - Disable JavaScript in browser.  
   - Open `/events` — primary list content or `EmptyState` visible in HTML (no eternal “Loading…”).  
   - Re-enable JS — register / withdraw buttons on event detail still work.

5. **Hook reload (US3)**  
   - On organizer create event: after success, list refreshes once; network tab shows single GET reload, not duplicate parallel loads.

6. **Regression**  
   ```bash
   cd apps/web && pnpm test
   # E3 manual path (abbreviated)
   ```
   - Fighter self-register → withdraw.  
   - Organizer publish → schedule entry → change log.

## Phase B spot-check

7. Captain pending approvals and `me/team-affiliation` show shared `ProblemAlert` / `StatusBadge` for membership states.

## Phase C spot-check

8. Admin users provision + teams overview use `EntityList` + `EmptyState`; errors use shared client.

## Accessibility (constitution III)

- Tab to `ProblemAlert` after failed mutation — announced as alert.  
- `StatusBadge`: verify text label visible without relying on color alone.

## Success criteria mapping

| ID | Quickstart step |
|----|-----------------|
| SC-001 | `rg` zero matches in migrated paths (step 1 baseline vs after phase) |
| SC-002 | Step 3 |
| SC-003 | Step 4 (manual, n≥3 testers) |
| SC-004 | Step 1 `pnpm test` + full suite |
| SC-005 | Baseline `wc -l` vs post–Phase A |

**Next**: `/speckit-tasks` → `tasks.md`; implementation via `/speckit-implement`.
