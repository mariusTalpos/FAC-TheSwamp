# Phase 0 — Research: UI Shared Layer (Epic 004)

Decisions build on the **implemented E1–E3 stack** ([001](../001-foundation-identity-roles/research.md), [002](../002-teams-rosters/research.md), [003](../003-events-registration/research.md)): Next.js 15 App Router, React 19, Auth.js v5, Vitest, `apps/web` monolith. Domain logic stays in `src/lib/{auth,teams,events}/`; this epic consolidates **presentation and data-loading patterns** only.

## 1. Shared browser HTTP client

**Decision**: Add `src/lib/api/client.ts` with typed `apiGet` / `apiPost` / `apiJson` helpers that:

- Call existing `/api/*` routes with `credentials: "same-origin"` (session cookie).
- On non-OK responses, parse JSON body and extract `message` from the existing **`ProblemJson`** shape (`{ code, message }` in `src/lib/api/problem-json.ts`) — not RFC 7807 `application/problem+json` media type (server returns `application/json` today).
- Return `Result<T, ApiClientError>` or throw a typed `ApiClientError` with `userMessage` + `code` for hooks to surface.

**Rationale**: FR-001/FR-002; 18+ page files duplicate `await res.json().catch(() => ({}))` + `typeof data.message === "string"`. Centralizing aligns with server helpers already using `problemJson()`.

**Alternatives considered**:

- **Axios / ky**: Extra dependency; `fetch` is sufficient for same-origin JSON.
- **TanStack Query as client layer**: Deferred per spec; hooks address v1 duplication without cache policy design.

## 2. Resource loading hook

**Decision**: Add `src/hooks/use-api-resource.ts` (name finalized in [contracts/ui-modules.md](./contracts/ui-modules.md)) exposing:

- `data`, `loading`, `error` (user-visible string), `reload()`, `runMutation(fn)`.
- Initial load on mount; `reload` after successful mutation; abort/cleanup via `AbortController` on unmount or `resourceKey` change.

**Rationale**: FR-003; replaces repeated `useState` + `useCallback` + `useEffect` blocks (e.g. `events/page.tsx`, `organizer/events/page.tsx`, `events/[eventId]/page.tsx`).

**Alternatives considered**:

- **One hook per domain** (`useEventList`): Faster per-page migration but duplicates hook mechanics; generic resource hook + thin page wrappers preferred for constitution reuse.
- **React `use()` + Suspense only**: Good for server-first reads; client mutations still need local state — hybrid approach below.

## 3. Server-first reads (App Router)

**Decision**: For read-heavy routes in migration scope, convert **page** to async Server Component that:

1. Calls `auth()` and redirects if unauthenticated (same as `me/page.tsx`).
2. Loads data via existing **domain services** (`listPublishedUpcomingEvents`, `getEventRow`, team list helpers, etc.) — same functions Route Handlers use, not duplicate SQL in pages.
3. Renders static list/detail markup server-side; extracts **mutation UI** into colocated `*-actions.tsx` client components using shared client + hooks.

**Rationale**: FR-006; precedent in `(public)/public/events/[eventId]/page.tsx` and `(auth)/me/page.tsx`. Eliminates first-paint “Loading…” from client-only `useEffect` fetch.

**Alternatives considered**:

- **Server Actions for mutations**: Possible later; v1 keeps POST to existing Route Handlers so API contracts stay frozen (FR-007).
- **RSC fetch to Route Handlers**: Extra hop; direct service import is fewer layers and matches public event page.

## 4. Shared presentation components

**Decision**: Add under `src/components/ui/`:

| Component | Responsibility |
|-----------|----------------|
| `ProblemAlert` | `role="alert"`, displays error string, optional `onDismiss` |
| `StatusBadge` | Lifecycle / registration / membership status with text + non-color cue (`aria-label`, prefix icon or bracket text) |
| `EventListRow` | Single row for `EventListItem` / `EventResponse` list fields |
| `EntityList` | Generic `<ul>` wrapper with loading/empty slots |
| `EmptyState` | Title + description props; used when `items.length === 0` |
| `SuccessMessage` | Consistent success region (pairs with ProblemAlert) |

Domain-specific labels (e.g. `lifecycle_status` → “Published”) live in `src/lib/events/labels.ts` (and teams analogue) consumed by `StatusBadge`.

**Rationale**: FR-004/FR-005; fighter vs organizer event lists today duplicate `<li>` markup with slightly different fields.

**Alternatives considered**:

- **Headless UI / Radix**: Out of scope (no new vendor design system).
- **One mega `DataTable`**: Over-abstracted for v1 list sizes.

## 5. Auth failure on client mutations

**Decision**: Shared client maps `401` → redirect to `/login` (or set error “Session expired—sign in again” if redirect undesirable during SSR boundary); `403` → surface server `message` via `ProblemAlert`. Align with E1 login flow.

**Rationale**: Spec edge case “session expiry during client mutation”.

**Alternatives considered**:

- **Silent retry**: Hides auth failure; rejected.

## 6. CI guard for legacy error parsing

**Decision**: Add Vitest coverage for `parseProblemMessage()` (or equivalent) with ≥90% branch coverage (SC-004). Add optional `pnpm lint:ui-duplication` script grepping migrated paths for `setError(typeof data.message` until Phase gates pass; wire into CI after Phase A.

**Rationale**: SC-001 measurable outcome.

**Alternatives considered**:

- **ESLint custom rule**: Stronger but higher setup cost; grep script acceptable for v1 with path allowlist for unmigrated public pages.

## 7. Deferred: client cache library & page-level DB access

**Decision**: **No** SWR/TanStack Query in v1; **no** refactoring pages that query DB directly in this epic (admin user detail stays as-is until backend-consistency work).

**Rationale**: Spec “Deferred decisions” table; reduces blast radius.

## 8. Phase ordering and LOC baseline

**Decision**: Implementation order: shared client (FR-001) → components (FR-004) → event surfaces (FR-005) → hooks + server-first (FR-003/FR-006) → Phase B teams → Phase C admin. Capture LOC baseline for `app/(auth)/events/**` and `app/(auth)/organizer/events/**` before Phase A merge for SC-005.

**Rationale**: Spec product notes; events are highest duplication density post-E3.

**Alternatives considered**:

- **Big-bang all routes**: Rejected (User Story 5 incremental migration).
