# Feature Specification: UI Shared Layer (Tech Debt)

**Feature Branch**: `004-ui-shared-layer`

**Created**: 2026-05-27

**Status**: Draft

**Input**: After completing Epics E1–E3, reduce duplicated UI code across authenticated screens. Consolidate repeated client fetch/state/error handling, introduce shared presentation building blocks, and adopt server-first data loading for read-heavy pages—without changing business rules or public API contracts.

**References**: [.specify/memory/constitution.md](../../.specify/memory/constitution.md) (Principles I–II: readability and reusability). Depends on completed behavior in [specs/001-foundation-identity-roles/spec.md](../001-foundation-identity-roles/spec.md), [specs/002-teams-rosters/spec.md](../002-teams-rosters/spec.md), and [specs/003-events-registration/spec.md](../003-events-registration/spec.md). Domain logic remains in existing `src/lib/*` services; this epic changes **how screens load and present** data, not **what** the platform allows.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent errors and feedback (Priority: P1)

A signed-in user (fighter, captain, organizer, or FAC administrator) performs actions on any primary screen (register for an event, manage a team, update a profile). When the server rejects an action, they see a **clear, consistent error message** in the same visual pattern—not different wording or layout per screen for the same failure type.

**Why this priority**: Duplicated fetch/error parsing today produces inconsistent UX and makes defects hard to spot; one error presentation path fixes the highest-friction user-visible symptom.

**Independent Test**: Trigger the same API validation failure from two different screens (e.g. event registration closed and team application to a deactivated team). Verify both show the same alert pattern and surface the server-provided message when present.

**Acceptance Scenarios**:

1. **Given** an authenticated user on any migrated screen, **When** an API call fails with a structured problem response, **Then** the user sees a single, accessible error region with the server message (or a safe fallback) without duplicate inline copies of parsing logic in that screen file.
2. **Given** a successful mutation (register, withdraw, create draft event), **When** the action completes, **Then** success feedback uses the same pattern as other migrated screens (message region or equivalent), and the view reloads authoritative data once.
3. **Given** a network or unexpected failure, **When** no structured message is available, **Then** the user sees a generic, non-technical fallback consistent across migrated screens.

---

### User Story 2 - Shared presentation for lists and entity summaries (Priority: P1)

Users browsing **events**, **teams**, or **account** areas see familiar list rows, status labels, and empty states whether they are a fighter, organizer, captain, or administrator—where the underlying data is the same shape (e.g. event name, start time, venue, lifecycle status).

**Why this priority**: Product owner marked shared components as **very important**; most line-count duplication is repeated markup for lists, badges, and empty states across role-specific routes.

**Independent Test**: Open fighter event list and organizer event list; confirm shared list row component renders equivalent fields; change event lifecycle status and confirm the same status label component appears on fighter detail and organizer detail for the same event.

**Acceptance Scenarios**:

1. **Given** two screens that display the same event list fields, **When** both are migrated, **Then** they use the same list row component and do not duplicate list item markup.
2. **Given** an event with lifecycle status **published**, **When** viewed on fighter and organizer detail surfaces, **Then** status is shown via the same status label component and text mapping.
3. **Given** a list API returns zero items, **When** the user opens a migrated list page, **Then** they see the shared empty-state component with role-appropriate copy passed as props (not copy-pasted layout).
4. **Given** a registration or membership status, **When** shown on any migrated summary, **Then** status uses a shared badge/label component with distinct non-color-only cues per constitution accessibility expectations.

---

### User Story 3 - Shared client data loading for interactive screens (Priority: P2)

A user interacts with forms and buttons that still require client-side requests (mutations, multi-step flows). Loading and refetch behavior feels consistent: a visible loading state, no stale duplicate requests, and a single reload after success.

**Why this priority**: Hooks consolidate `useState` / `useEffect` / `fetch` boilerplate; they unlock faster migration of remaining client-heavy pages.

**Independent Test**: On a migrated client page, observe loading indicator on first load and after a mutation; confirm only one refetch runs after successful POST.

**Acceptance Scenarios**:

1. **Given** a migrated client page that loads JSON from the existing HTTP API, **When** the page mounts, **Then** loading and error states are driven by a shared hook (or equivalent single abstraction), not ad-hoc state in the page file.
2. **Given** a successful mutation on a migrated page, **When** the hook’s reload runs, **Then** displayed data matches server state without manual copy-paste of `load()` functions per action.
3. **Given** concurrent navigations away and back, **When** the user returns, **Then** the page does not leave orphaned error state from a prior session on unrelated routes (hook resets or scopes state to the resource).

---

### User Story 4 - Server-first reads on list and detail pages (Priority: P2)

A signed-in user opens a **read-heavy** page (event list, event detail metadata, team roster view where no immediate mutation is required). The first paint includes authoritative data without a client-side “Loading…” flash caused entirely by post-mount `fetch`.

**Why this priority**: Next.js App Router supports server rendering; moving reads server-side removes the largest class of duplicate client loaders while keeping small client islands for buttons.

**Independent Test**: Disable JavaScript in the browser; open a migrated server-first list page and confirm primary content is present in HTML. With JS enabled, confirm mutation buttons still work via client islands.

**Acceptance Scenarios**:

1. **Given** a migrated read-only list route, **When** the user requests the page, **Then** the initial HTML includes the list data (or an explicit empty state) loaded via server-side access to existing domain services or route handlers—not client `useEffect` fetch on first paint.
2. **Given** a migrated detail route with server-loaded metadata, **When** the user uses an action button (e.g. register), **Then** only the interactive control tree is client-side; the page does not reimplement full detail loading in the client for static fields.
3. **Given** an unauthorized or missing resource on a server-first page, **When** the user opens the URL, **Then** they receive the same not-found or forbidden handling pattern as other migrated server routes (no blank client shell).

---

### User Story 5 - Incremental migration coverage (Priority: P3)

Maintainers can migrate screens in slices (events slice, then teams, then admin/account) without breaking unmigrated pages. Each slice meets a defined coverage threshold before the epic is considered complete.

**Why this priority**: Big-bang rewrite risk; phased delivery matches constitution reuse goals while keeping E1–E3 shippable throughout.

**Independent Test**: After Phase A (events), run existing event-related unit/integration tests and manual quickstart paths; confirm zero regression in API behavior. Repeat for Phase B (teams) and Phase C (admin/account).

**Acceptance Scenarios**:

1. **Given** Phase A complete, **When** reviewers inspect event-related routes under `app/(auth)/events` and `app/(auth)/organizer/events`, **Then** **100%** of those pages use the shared API client, hooks or server loaders, and shared components per the migration checklist in plan/tasks (to be generated).
2. **Given** Phase B complete, **When** reviewers inspect captain and `me/team-affiliation` routes, **Then** the same consolidation rules apply with no duplicate list/status markup for team entities.
3. **Given** Phase C complete, **When** reviewers inspect FAC admin list/detail pages for users and teams, **Then** shared error and list patterns apply; unmigrated public/auth pages outside scope remain functional.

---

### Edge Cases

- **Partial migration**: Unmigrated pages keep legacy behavior; no requirement that every route in the repo migrates in v1 if Phase thresholds are met—document any intentional exceptions in plan.
- **Session expiry during client mutation**: Shared client layer MUST surface auth failure consistently (redirect or message aligned with E1 login flow).
- **Optimistic UI**: Out of scope for v1; mutations wait for server acknowledgment unless plan explicitly adds optimistic updates for a single flow.
- **Accessibility**: Shared components MUST preserve or improve keyboard focus order, `role="alert"` for errors, and visible timezone/status text already required by E3.
- **Type contracts**: Shared UI consumes existing `export type` DTOs from domain `contracts.ts` files; no mass rename to `interface`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST provide a **single shared HTTP client module** for browser calls to existing JSON APIs, including: typed GET/POST helpers, parsing of problem+json (or equivalent) error bodies, and extraction of a user-visible message with a safe fallback.
- **FR-002**: All screens in the **migration scope** MUST use the shared HTTP client for API calls; inline `fetch` + ad-hoc `data.message` parsing MUST NOT remain in migrated page files.
- **FR-003**: The application MUST provide **shared React hooks** (or one composable abstraction) for resource load, loading/error state, and post-mutation reload on client-interactive pages.
- **FR-004**: The application MUST provide a **shared components library** under `src/components/` (or documented equivalent) including at minimum: **ProblemAlert** (errors), **StatusBadge** (lifecycle/registration/membership statuses), **EntityList** / list row primitives, and **EmptyState**.
- **FR-005**: **Event** list and detail surfaces for fighter and organizer roles MUST use shared list row and status components (User Story 2—**mandatory** for this epic).
- **FR-006**: Read-heavy routes identified in planning MUST load initial data **on the server** (Server Components or equivalent) calling existing `src/lib/*` services or internal server-only loaders—without duplicating SQL in page files.
- **FR-007**: Migrated pages MUST continue to use existing **API route contracts** and domain services; this epic MUST NOT change OpenAPI paths, request/response shapes, or authorization rules unless a separate defect fix is filed.
- **FR-008**: Shared UI MUST consume existing **`export type`** definitions from domain `contracts.ts` files; renaming to `interface` is out of scope.
- **FR-009**: The epic MUST include a **migration checklist** (in plan/tasks) listing every `app/(auth)/**` page and marking shared-client, hook/server-loader, and component adoption—Phases A–C as in User Story 5.
- **FR-010**: Automated tests MUST cover the shared HTTP client error parsing and at least one representative hook or server loader path; existing E1–E3 domain tests MUST continue to pass without modification of business assertions unless a regression is found and fixed.

### Key Entities *(presentation layer)*

- **Screen resource**: A page-level unit of UI bound to one primary API resource or server loader result (e.g. event detail, team roster).
- **Shared presentation primitive**: Reusable visual unit (alert, badge, list row, empty state) parameterized by props, not by copy-pasted JSX.
- **Client mutation**: User-triggered write that still requires browser `fetch` or form POST after initial server render.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After migration, **zero** occurrences of the legacy inline pattern `setError(typeof data.message === "string"` in files under migrated route groups (automated grep or lint rule in CI).
- **SC-002**: Event fighter list and organizer list share **one** list row component file; removing a field from that component updates both screens (verified by code review or snapshot test).
- **SC-003**: On migrated server-first list pages, **100%** of moderated testers see primary list content on first paint without a client-only loading spinner (manual script, n ≥ 3).
- **SC-004**: Existing Vitest suites for `lib/events` and `lib/teams` pass unchanged; new unit tests cover shared client error parsing with **≥ 90%** branch coverage on the parser module.
- **SC-005**: Lines of code in `app/(auth)/events/**` and `app/(auth)/organizer/events/**` decrease by **≥ 25%** compared to pre-epic baseline (measured before Phase A merge and after Phase A complete), without reducing user-visible capabilities.

### Verification expectations

- Phase gates: no phase merges without running existing unit tests + targeted Playwright or manual quickstart paths for touched domains.
- Accessibility spot-check on shared **StatusBadge** and **ProblemAlert** for keyboard and screen-reader labels.

## Assumptions

- **No business rule changes**: Registration, team, and event policies from E1–E3 remain authoritative in `src/lib/*` services.
- **API surface frozen**: Route handlers stay thin wrappers; this epic does not split or merge API routes.
- **Incremental delivery**: Phases A (events) → B (teams/captain/me) → C (admin) are acceptable; public marketing/login pages may remain client-heavy until a follow-up.
- **Styling**: Reuse existing global/CSS patterns; no new design system or component library vendor (e.g. MUI) in v1.
- **Types**: Continue `export type` + Zod + Drizzle inference; no `interface` migration.
- **Auth**: Session and RBAC behavior unchanged; shared client respects existing 401/403 responses.

## Dependencies

- Completed E1, E2, E3 features and their HTTP APIs.
- Constitution Principles I (readability) and II (reusability)—this epic is the explicit remediation for UI-layer duplication called out in post-E3 review.

## Out of scope (this epic)

- **Client cache libraries** (e.g. SWR, TanStack Query): not required for v1; see product note below and optional future spike.
- **Migrating pages that query the database directly** (bypassing `src/lib` services): tracked as separate backend-consistency work; UI epic may consume services once those pages are fixed, but DB-access refactors are not gate criteria for SC-001–SC-005.
- Visual redesign, branding, or responsive layout overhaul.
- New user-facing features, routes, or API operations.
- Collapsing multiple API route files into one handler.
- E4+ match/schedule competition features.
- Renaming TypeScript `type` to `interface`.

### Deferred decisions (documented, not in v1 scope)

| Topic | Decision for v1 | Rationale (summary) |
|-------|-----------------|---------------------|
| Client cache library | **Defer** | Shared hooks + server-first reads address duplication without new dependency; cache invalidation policy needs its own spike. |
| Page-level DB access | **Defer** | Service-layer consistency is a backend refactor; mixing it into UI migration increases blast radius. UI work uses existing APIs/services only. |

## Product notes for planning (not requirements)

Planning (`/speckit-plan`) SHOULD map FR-001–FR-010 to concrete paths (`src/lib/api/client.ts`, `src/hooks/`, `src/components/`) and list each page in the migration checklist. Implementation order: FR-001 → FR-004 → FR-005 (events) → FR-003/FR-006 → remaining phases.
