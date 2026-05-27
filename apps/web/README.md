# FAC web app (`apps/web`)

Epic E1 implementation: Next.js (App Router), PostgreSQL, Drizzle ORM, Auth.js v5 (JWT sessions + Credentials), Zod validation, Vitest, Playwright.

## Prerequisites

- Node.js 20+
- PostgreSQL 16+ (see root `docker-compose.yml`)

## Setup

1. Copy `apps/web/.env.example` to `apps/web/.env.local` and set secrets (`AUTH_SECRET`, `DATABASE_URL`).
2. From repo root: `docker compose up -d postgres`
3. `cd apps/web && npx pnpm@10.9.0 install`
4. `npx pnpm@10.9.0 db:migrate` (requires `DATABASE_URL`)
5. `npx pnpm@10.9.0 db:seed` — seeds `operational_role` rows (`fac_admin`, `marshal`, …).
6. **Dev test accounts** (optional, for permission testing):  
   `npx pnpm@10.9.0 db:seed-dev` — see table below.  
   Or register via `/register/fighter`, then `npx pnpm@10.9.0 db:grant-admin -- your@email.com`.

### Dev test accounts (`pnpm db:seed-dev`)

| Email | Password (default) | Roles | Fighter profile |
|-------|-------------------|-------|-----------------|
| `admin@fac.test` | `TestPassword123!` | `fac_admin` | no |
| `marshal@fac.test` | same | `marshal` | yes (complete) |
| `organizer@fac.test` | same | `organizer` | no |
| `squire@fac.test` | same | `squire` | no |
| `fighter@fac.test` | same | none | yes (complete) |

Override password: `DEV_SEED_PASSWORD=YourSecret pnpm db:seed-dev`

## Dev environment (Cursor / VS Code)

Run **Tasks: Run Task** → **FAC: Dev** (or bind a shortcut to that task).

Starts three dedicated terminals:

1. **Postgres** — `scripts/dev-postgres.sh` (starts container, waits for `pg_isready`, then `docker compose logs -f`)
2. **Next.js** — `scripts/dev-web.sh` (waits for port 3000, then signals ready)
3. **Drizzle Studio** — `scripts/dev-studio.sh`

Postgres starts first; the app and Studio start in parallel once the database is ready (works even if the container was already running). Requires **bash** (Git Bash on Windows). Stop each terminal with the trash icon, or **Terminal: Kill All Terminals**.

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Next.js dev server |
| `pnpm build` / `pnpm start` | Production build |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Generate Drizzle SQL from `src/lib/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Upsert operational roles |
| `pnpm db:grant-admin <email>` | Grant `fac_admin` to a user (bootstrap) |
| `pnpm test` | Vitest |
| `pnpm exec playwright test` | Playwright |

## Auth flows

- Fighter registration: `POST /api/auth/register/fighter` + UI `/register/fighter`.
- Sign-in: Credentials via Auth.js (`/api/auth/*`) and UI `/login`.
- Forgot password: `POST /api/auth/forgot-password` (always `202`, no enumeration).
- Reset completion: `POST /api/auth/reset-password` with `{ token, newPassword }` and UI `/reset-password?token=…`.

## API surface

Logical OpenAPI paths are implemented under `src/app/api/**` (for example `POST /api/auth/register/fighter`).
