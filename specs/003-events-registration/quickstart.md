# Quickstart (Epic E3 — Events & Registration)

Assumes **E1** and **E2** are running locally ([001 quickstart](../001-foundation-identity-roles/quickstart.md), [002 quickstart](../002-teams-rosters/quickstart.md)).

## Prerequisites

- E1/E2 migrations and seeds applied (`operational_role`, dev users including `organizer@fac.test`, `fighter@fac.test`, `marshal@fac.test`).
- Branch `003-events-registration` checked out.

## Database

1. Apply E3 migrations (after implementation):

   ```bash
   pnpm db:migrate
   ```

2. Optional demo events seed (after implementation):

   ```bash
   cd apps/web && pnpm db:seed-events
   ```

## Environment

Copy from `apps/web/.env.example`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `PUBLIC_EVENTS` | `false` | When `true`, enables `GET /api/public/events/*` |

**Timezone library**: E3 uses **`luxon`** for parsing organizer-entered local datetimes in `event.timezone` and rendering schedule/deadlines in the event timezone (default **`America/New_York`**). Instants are stored as UTC (`timestamptz`).

## Manual acceptance path (SC-004)

Target: **under 15 minutes** for a new tester.

1. Sign in as **`organizer@fac.test`** (global organizer role).
2. Create event **"Spring Buhurt 2026"** (draft) with name, timezone, start time, venue (optional description for competition scope—structured fight types are E4).
3. Publish with registration **open** (window includes today).
4. Sign in as **`fighter@fac.test`** → open upcoming events → **self-register** (no captain step).
5. Sign in as unaffiliated fighter (register new or use seeded unaffiliated account) → confirm registration succeeds.
6. Sign in as **`marshal@fac.test`** → register as **staff (marshal)** for the same event.
7. As organizer, add two **schedule entries** with start times; view board.
8. Move one entry’s start time with an optional **reason** → confirm change appears on board.
9. As FAC admin, open **schedule change history** for the event → confirm actor and timestamp (SC-003).
10. As **`fighter@fac.test`**, view schedule for registered event → times show with **timezone in text**.
11. As second organizer user (if seeded), attempt to edit first organizer’s event → **denied** (US1).
12. As FAC admin, **reassign organizer** to second organizer → new organizer can edit; prior organizer cannot.

## Tests

```bash
pnpm test
pnpm exec playwright test --grep "event"
```

## API contract

HTTP semantics: [contracts/openapi.yaml](./contracts/openapi.yaml). Implement under `apps/web/src/app/api/`:

- `events/`, `events/[eventId]/`
- `admin/events/[eventId]/sanction`, `admin/events/[eventId]/organizer`
- `events/[eventId]/registrations/*`
- `events/[eventId]/schedule/*`
- `public/events/` (when `PUBLIC_EVENTS=true`)

Domain logic: `apps/web/src/lib/events/` (permissions, registration service, schedule service, audit helpers).

## Operational role note

Spec “event organizer” maps to E1 operational role key **`organizer`** (not a separate `event_organizer` seed). Per-event ownership is `event.organizer_user_id`.
