# Data Model: UI Shared Layer (Epic 004)

This epic does **not** introduce database tables or API schema changes. Entities below describe the **presentation layer** and shared client abstractions. Domain entities remain in E1–E3 [data-model](../003-events-registration/data-model.md) docs and `src/lib/*/contracts.ts`.

## 1. `ApiClientError`

Normalized failure from the shared browser HTTP client.

| Field | Type | Notes |
|-------|------|--------|
| `httpStatus` | `number` | Response status (0 if network failure). |
| `code` | `string` | From `ProblemJson.code` when present; else `"unknown"`. |
| `userMessage` | `string` | Safe display string; fallback when body unparsable. |
| `raw` | `unknown`, optional | Parsed JSON body for logging (not shown to users). |

**Rules**: `userMessage` MUST NOT leak stack traces or internal codes without human-readable text.

## 2. `ResourceState<T>`

Hook-held state for a client-interactive screen resource.

| Field | Type | Notes |
|-------|------|--------|
| `data` | `T \| null` | Last successful load. |
| `loading` | `boolean` | True during initial or explicit reload. |
| `error` | `string \| null` | User-visible message from `ApiClientError.userMessage`. |
| `reload` | `() => Promise<void>` | Refetch without mutation. |

**Transitions**:

```text
idle → loading (mount | reload)
loading → ready (data set, error cleared)
loading → error (non-OK or network)
ready → loading (reload | post-mutation refresh)
error → loading (user retry via reload)
```

## 3. `ScreenResource<T>`

Server-first page binding: authoritative initial payload + optional client overlay.

| Field | Type | Notes |
|-------|------|--------|
| `initialData` | `T` | Loaded in Server Component via domain service. |
| `resourceKey` | `string` | Stable id (e.g. `eventId`) for client hook scoping. |
| `clientMutations` | list of `ClientMutation` | Actions still requiring browser POST. |

**Rules**: `initialData` MUST match what `/api/*` would return for the same session; no second divergent query shape in the page file.

## 4. `ClientMutation`

User-triggered write after server render.

| Field | Type | Notes |
|-------|------|--------|
| `id` | `string` | e.g. `register-fighter`, `create-event`. |
| `method` | `"POST" \| "PATCH" \| "DELETE"` | Matches existing Route Handlers. |
| `path` | `string` | `/api/...` path. |
| `body` | `unknown`, optional | JSON body. |
| `successMessage` | `string` | Shown via `SuccessMessage`. |
| `onSuccess` | `reload` parent resource | Single refetch (FR-003). |

**Rules**: No optimistic UI in v1; wait for server OK before `reload`.

## 5. `SharedPresentationPrimitive`

Reusable visual unit (React component contract).

| Primitive | Key props | Consumes |
|-----------|-----------|----------|
| `ProblemAlert` | `message`, `title?` | `string` |
| `StatusBadge` | `variant`, `label` | Domain label maps + `StatusVariant` union |
| `EventListRow` | `event: EventListItem \| EventResponse` | `@/lib/events/contracts` |
| `EmptyState` | `title`, `description` | strings |
| `EntityList` | `items`, `renderRow`, `empty` | generic `T[]` |

### 5.1 `StatusVariant` (presentation enum)

Union used only for styling/accessibility — maps from domain enums:

- **Events**: `lifecycle_status`, `registration_status`, `schedule_entry_status`
- **Teams**: `membership_status`, `application_status`, `team_active`

**Rules**: Each variant MUST have visible text; color MUST NOT be the only differentiator (constitution III / spec edge cases).

## 6. `MigrationSlice`

Checklist row for incremental delivery (FR-009).

| Field | Type | Notes |
|-------|------|--------|
| `route` | `string` | `app/(auth)/.../page.tsx` path. |
| `phase` | `"A" \| "B" \| "C"` | Events / teams / admin. |
| `sharedClient` | `boolean` | Uses `src/lib/api/client.ts`. |
| `dataLoading` | `"server" \| "hook" \| "legacy"` | Target pattern. |
| `components` | `string[]` | Adopted shared components. |

Full inventory: [contracts/migration-checklist.md](./contracts/migration-checklist.md).

## Relationships

```text
ScreenResource ──initial──► Server Component (page.tsx)
ScreenResource ──mutations──► ClientMutation ──► api client ──► Route Handler ──► domain service
ResourceState ◄── useApiResource ◄── api client
SharedPresentationPrimitive ◄── props from domain export types (no interface renames)
```
