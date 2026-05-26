# Quickstart (Epic E2 — Teams & Rosters)

Assumes **E1** is running locally ([001 quickstart](../001-foundation-identity-roles/quickstart.md)).

## Prerequisites

- E1 migrations and seeds applied (`operational_role`, test users).
- Branch `002-teams-rosters` checked out.

## Database

1. Apply E2 migrations (after implementation):

   ```bash
   pnpm db:migrate
   ```

2. Optional demo team seed:

   ```bash
   cd apps/web && npx tsx scripts/seed-teams-demo.ts
   ```

## Manual acceptance path (SC-004)

1. Sign in as **FAC admin** → create team “North Hold” → assign `captain@fac.test` as captain.
2. Sign in as **fighter** (new registration or `fighter@fac.test`) → confirm **unaffiliated** on `/me` or affiliation API.
3. Apply to “North Hold” as **fighter**.
4. Sign in as **captain** → open pending queue → **approve**.
5. Confirm fighter on **active roster**; captain view shows member.
6. As the **approved fighter**, open team affiliation / roster view → confirm other **active** members appear and **pending** applicants do not (FR-005 member read).
7. Sign in as **marshal** without team → confirm no forced team apply (SC-005).
8. Re-approve fighter on roster if needed, then captain **ends** membership → verify fighter unaffiliated; history visible to admin.
9. Sign in as **FAC admin** → on team detail, **end** the same (or another) active membership via `POST /admin/teams/{teamId}/memberships/{membershipId}/end` (FR-007 admin remove; matches captain end semantics).
10. (Optional) **Transfer**: admin ends membership on Team A → fighter applies to Team B → captain or admin approves (research.md §6).
11. (Optional) Fighter rejected once → re-apply to same team → confirm **new** membership id in API/DB; rejected row id unchanged (FR-012).

## Tests

```bash
pnpm test
pnpm exec playwright test --grep "team"
```

## Environment

No new secrets required beyond E1. Copy from `apps/web/.env.example`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `PUBLIC_TEAM_ROSTER` | `false` | When `true`, enables `GET /api/public/teams/*` and optional public team pages |

Set `PUBLIC_TEAM_ROSTER=true` in `.env.local` to enable public read models (default off per [research.md](./research.md)).

## API contract

HTTP semantics: [contracts/openapi.yaml](./contracts/openapi.yaml). Implement under `apps/web/src/app/api/` mirroring E1 layout (`admin/teams`, `captain/teams`, `me/team-memberships`).
