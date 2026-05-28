# UI Module Contracts (Epic 004)

Internal contracts for shared presentation and client data loading. **No HTTP API paths or request/response shapes change** (FR-007). Domain DTOs remain `export type` in `src/lib/*/contracts.ts` (FR-008).

## 1. `src/lib/api/client.ts`

```typescript
import type { ProblemJson } from "@/lib/api/problem-json";

export type ApiClientError = {
  httpStatus: number;
  code: string;
  userMessage: string;
  raw?: unknown;
};

export function parseProblemMessage(body: unknown, fallback: string): string;

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T>;

export async function apiPost<T>(
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T>;

/** Throws ApiClientError on failure; returns parsed JSON on success. */
export async function apiJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T>;
```

**Behavior**:

- `Content-Type: application/json` on POST when `body` provided.
- `credentials: "same-origin"`.
- On `!res.ok`: parse JSON; if `ProblemJson.message` string, use it; else `fallback` / status-based default.
- On `401`: `window.location.assign("/login")` in browser context (client components only).

## 2. `src/hooks/use-api-resource.ts`

```typescript
export type UseApiResourceOptions<T> = {
  /** Stable key; changing key resets state and aborts in-flight fetch. */
  resourceKey: string;
  loader: () => Promise<T>;
  /** When false, skip auto-load (rare; prefer server initialData). */
  enabled?: boolean;
};

export type UseApiResourceResult<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  runMutation: <R>(fn: () => Promise<R>) => Promise<R | null>;
};
```

**`runMutation`**: Clears error, runs `fn`, on success calls `reload()` once, on failure sets `error` from `ApiClientError.userMessage`, returns `null`.

## 3. `src/components/ui/*`

### ProblemAlert

```typescript
export type ProblemAlertProps = {
  message: string;
  title?: string;
  onDismiss?: () => void;
};
```

- Renders container with `role="alert"`.

### StatusBadge

```typescript
export type StatusVariant =
  | "event-lifecycle"
  | "registration"
  | "membership"
  | "application"
  | "neutral";

export type StatusBadgeProps = {
  variant: StatusVariant;
  status: string; // domain enum value
  label?: string; // override display
};
```

### EventListRow

```typescript
import type { EventListItem, EventResponse } from "@/lib/events/contracts";

export type EventListRowProps = {
  event: EventListItem | EventResponse;
  href: string;
  showOrganizerMeta?: boolean;
};
```

### EmptyState

```typescript
export type EmptyStateProps = {
  title: string;
  description?: string;
};
```

### EntityList

```typescript
export type EntityListProps<T> = {
  items: T[];
  renderRow: (item: T) => React.ReactNode;
  empty: React.ReactNode;
  loading?: boolean;
  "aria-label"?: string;
};
```

### SuccessMessage

```typescript
export type SuccessMessageProps = { message: string };
```

## 4. Server loader helpers (new, thin)

Colocated under `src/lib/ui/server-loaders/` (or domain re-exports):

```typescript
// events
export async function loadFighterEventsList(): Promise<EventListItem[]>;
export async function loadOrganizerEventsList(
  userId: string,
  isAdmin: boolean,
): Promise<EventResponse[]>;
export async function loadEventDetailForSession(
  eventId: string,
  userId: string,
): Promise<{ event: EventResponse; /* … */ } | null>;
```

Each wraps existing `event-service` / `permissions` checks used by Route Handlers; pages MUST NOT import `db` directly (constitution readability).

## 5. File layout (delivered)

```text
apps/web/src/
├── lib/
│   ├── api/
│   │   ├── problem-json.ts      # existing
│   │   └── client.ts              # new
│   ├── ui/
│   │   ├── server-loaders/
│   │   │   ├── events.ts
│   │   │   └── teams.ts
│   │   └── labels/
│   │       ├── events.ts
│   │       └── teams.ts
│   └── events/contracts.ts      # unchanged types
├── hooks/
│   └── use-api-resource.ts
└── components/
    └── ui/
        ├── problem-alert.tsx
        ├── status-badge.tsx
        ├── event-list-row.tsx
        ├── entity-list.tsx
        ├── empty-state.tsx
        └── success-message.tsx
```

## 6. Testing contract

| Module | Test file | Minimum coverage |
|--------|-----------|------------------|
| `parseProblemMessage` / client error paths | `tests/unit/api/client.test.ts` | ≥90% branches on parser |
| `useApiResource` | `tests/unit/hooks/use-api-resource.test.ts` | reload + mutation + error |
| One server loader | `tests/unit/ui/server-loaders/events.test.ts` | mocks service, asserts DTO shape |

Existing `lib/events` and `lib/teams` unit suites MUST pass unchanged (SC-004).
