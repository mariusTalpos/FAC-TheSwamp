# Quickstart (Epic E1 — after application scaffold exists)

This repo currently holds **specifications only**. Once implementation lands (see [plan.md](./plan.md)), use the following as the default developer path.

## Prerequisites

- Node.js **20 LTS** or newer
- **PostgreSQL 16+** (local Docker or managed instance)
- Optional: **Docker** for `docker compose` Postgres

## Environment

Create `.env.local` (Next.js) or `.env` in the app root (exact name per scaffold):

- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — strong random secret for session signing
- `EMAIL_*` — SMTP or provider keys for verification, **password-reset issuance**, and invitation mail for **`email_invitation`** admin provisioning (FR-002, FR-007)

Never commit secrets.

## Database

1. Start Postgres (example):

   ```bash
   docker compose up -d postgres
   ```

2. Run migrations (Drizzle or chosen tool):

   ```bash
   pnpm db:migrate
   ```

3. Seed **operational_role** reference rows from FAC’s controlled list (migration or seed script).

## Application

```bash
pnpm install
pnpm dev
```

Open the local URL; complete fighter registration flow in a disposable browser profile. Exercise **forgot password → reset completion** (`POST /auth/forgot-password` then `POST /auth/reset-password` or UI equivalent) and, when admin UI exists, **`POST /admin/users`** with each **`provisionMode`** and **`POST /admin/users/{userId}/deactivate`** against non-production data.

## Tests

```bash
pnpm test
pnpm exec playwright test
```

After scaffold, automated suites should cover **SC-002** (privileged self-grant / role API denial + audit), **SC-003** (public vs hidden after saves), and **FR-002** reset completion (forgot + reset) per [tasks.md](./tasks.md); retain evidence for **SC-001** / **SC-004** per spec (task script + results, scenario checklist). Keep a committed **accessibility verification** record (e.g. `apps/web/docs/accessibility-verification.md` or axe Playwright output summary) aligned with [spec.md](./spec.md) Verification expectations.

## FAC policy inputs (blocking for “complete” profile)

Before marking E1 done in production, FAC must supply (see [spec.md](./spec.md) Dependencies):

- Minimum profile field list and which are hideable
- Operational role keys and display names
- Exact **minimum public facts** when optional fields are hidden

Update migrations and `FighterProfilePublic` contract when those are finalized.
