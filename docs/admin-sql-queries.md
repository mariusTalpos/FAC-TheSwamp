# Admin SQL queries (local PostgreSQL)

Handy `psql` snippets for inspecting FAC-App data. Schema matches `apps/web/src/lib/db/schema.ts`.

## Connection

**Docker (repo root):**

```bash
docker exec -it fac-app-postgres-1 psql -U fac -d fac_app
```

**Local client:**

```
postgresql://fac:fac@localhost:5432/fac_app
```

Replace placeholders like `'your-team-slug'` or `'user@example.com'` before running.

---

## Teams

### List all teams

```sql
SELECT id, name, slug, region, tier_or_division, status, created_at
FROM team
ORDER BY name;
```

### List active teams only

```sql
SELECT id, name, slug, region, tier_or_division, created_at
FROM team
WHERE status = 'active'
ORDER BY name;
```

### Find a team by slug or name

```sql
-- by slug
SELECT * FROM team WHERE slug = 'your-team-slug';

-- by name (partial match)
SELECT id, name, slug, status FROM team WHERE name ILIKE '%search%';
```

### Teams with no active captain

```sql
SELECT t.id, t.name, t.slug, t.status
FROM team t
WHERE t.status = 'active'
  AND NOT EXISTS (
    SELECT 1
    FROM team_captain_assignment c
    WHERE c.team_id = t.id
      AND c.valid_to IS NULL
  )
ORDER BY t.name;
```

---

## Team captains

Active captain rows have `valid_to IS NULL`.

### List all teams with their current captains

```sql
SELECT
  t.name AS team_name,
  t.slug,
  u.email AS captain_email,
  COALESCE(u.name, fp.display_name) AS captain_name,
  c.valid_from AS captain_since
FROM team t
LEFT JOIN team_captain_assignment c
  ON c.team_id = t.id AND c.valid_to IS NULL
LEFT JOIN "user" u ON u.id = c.user_id
LEFT JOIN fighter_profile fp ON fp.user_id = u.id
ORDER BY t.name, u.email;
```

### Captains for one team (by slug)

```sql
SELECT
  u.id AS user_id,
  u.email,
  COALESCE(u.name, fp.display_name, fp.ring_name) AS display_label,
  c.valid_from
FROM team t
JOIN team_captain_assignment c
  ON c.team_id = t.id AND c.valid_to IS NULL
JOIN "user" u ON u.id = c.user_id
LEFT JOIN fighter_profile fp ON fp.user_id = u.id
WHERE t.slug = 'your-team-slug'
ORDER BY c.valid_from;
```

### Teams a user captains (by email)

```sql
SELECT t.id, t.name, t.slug, c.valid_from
FROM "user" u
JOIN team_captain_assignment c
  ON c.user_id = u.id AND c.valid_to IS NULL
JOIN team t ON t.id = c.team_id
WHERE u.email = 'captain@example.com'
ORDER BY t.name;
```

### Captain assignment history for a team

```sql
SELECT
  u.email,
  c.valid_from,
  c.valid_to,
  CASE WHEN c.valid_to IS NULL THEN 'active' ELSE 'ended' END AS assignment_status
FROM team t
JOIN team_captain_assignment c ON c.team_id = t.id
JOIN "user" u ON u.id = c.user_id
WHERE t.slug = 'your-team-slug'
ORDER BY c.valid_from DESC;
```

---

## Rosters & memberships

`member_kind`: `fighter` | `squire`  
`status`: `pending` | `active` | `rejected` | `ended`

### Active roster for a team (fighters and squires)

```sql
SELECT
  m.member_kind,
  u.email,
  COALESCE(fp.display_name, u.name) AS display_name,
  fp.ring_name,
  m.started_at,
  m.status
FROM team t
JOIN team_membership m ON m.team_id = t.id
JOIN "user" u ON u.id = m.user_id
LEFT JOIN fighter_profile fp ON fp.user_id = u.id
WHERE t.slug = 'your-team-slug'
  AND m.status = 'active'
ORDER BY m.member_kind, display_name;
```

### Active fighters on a team

```sql
SELECT
  u.id AS user_id,
  u.email,
  COALESCE(fp.display_name, u.name) AS display_name,
  fp.ring_name,
  fp.completion_state,
  m.started_at
FROM team t
JOIN team_membership m ON m.team_id = t.id
JOIN "user" u ON u.id = m.user_id
LEFT JOIN fighter_profile fp ON fp.user_id = u.id
WHERE t.slug = 'your-team-slug'
  AND m.status = 'active'
  AND m.member_kind = 'fighter'
ORDER BY display_name;
```

### Active squires on a team

```sql
SELECT u.email, u.name, m.started_at
FROM team t
JOIN team_membership m ON m.team_id = t.id
JOIN "user" u ON u.id = m.user_id
WHERE t.slug = 'your-team-slug'
  AND m.status = 'active'
  AND m.member_kind = 'squire'
ORDER BY u.email;
```

### Pending membership requests for a team

```sql
SELECT
  m.id AS membership_id,
  m.member_kind,
  u.email,
  m.requested_at,
  m.decision_note
FROM team t
JOIN team_membership m ON m.team_id = t.id
JOIN "user" u ON u.id = m.user_id
WHERE t.slug = 'your-team-slug'
  AND m.status = 'pending'
ORDER BY m.requested_at;
```

### Where is a user affiliated? (by email)

```sql
SELECT
  t.name AS team_name,
  t.slug,
  m.member_kind,
  m.status,
  m.started_at,
  m.ended_at
FROM "user" u
JOIN team_membership m ON m.user_id = u.id
JOIN team t ON t.id = m.team_id
WHERE u.email = 'fighter@example.com'
ORDER BY m.status, t.name;
```

### Roster counts per team

```sql
SELECT
  t.name,
  t.slug,
  COUNT(*) FILTER (WHERE m.status = 'active' AND m.member_kind = 'fighter') AS active_fighters,
  COUNT(*) FILTER (WHERE m.status = 'active' AND m.member_kind = 'squire') AS active_squires,
  COUNT(*) FILTER (WHERE m.status = 'pending') AS pending_requests
FROM team t
LEFT JOIN team_membership m ON m.team_id = t.id
GROUP BY t.id, t.name, t.slug
ORDER BY t.name;
```

---

## Users & operational roles

Active role assignments have `valid_to IS NULL`.  
Known role keys: `fac_admin`, `marshal`, `organizer`, `squire`.

### List all users (summary)

```sql
SELECT id, email, name, status, created_at
FROM "user"
ORDER BY email;
```

### Find user by email

```sql
SELECT * FROM "user" WHERE email = 'user@example.com';
```

### Users with an active operational role

```sql
SELECT
  u.email,
  r.key AS role_key,
  r.display_name AS role_name,
  ra.valid_from
FROM "user" u
JOIN role_assignment ra ON ra.user_id = u.id AND ra.valid_to IS NULL
JOIN operational_role r ON r.id = ra.operational_role_id
ORDER BY u.email, r.key;
```

### All FAC admins

```sql
SELECT u.id, u.email, u.name, u.status, ra.valid_from
FROM "user" u
JOIN role_assignment ra ON ra.user_id = u.id AND ra.valid_to IS NULL
JOIN operational_role r ON r.id = ra.operational_role_id
WHERE r.key = 'fac_admin'
ORDER BY u.email;
```

### Disabled users

```sql
SELECT id, email, name, updated_at
FROM "user"
WHERE status = 'disabled'
ORDER BY updated_at DESC;
```

---

## Fighter profiles

### All fighter profiles

```sql
SELECT
  u.email,
  fp.display_name,
  fp.ring_name,
  fp.completion_state,
  fp.created_at
FROM fighter_profile fp
JOIN "user" u ON u.id = fp.user_id
ORDER BY fp.display_name;
```

### Incomplete fighter profiles

```sql
SELECT u.email, fp.display_name, fp.updated_at
FROM fighter_profile fp
JOIN "user" u ON u.id = fp.user_id
WHERE fp.completion_state = 'incomplete'
ORDER BY fp.updated_at;
```

### Users with profile but no active fighter membership

```sql
SELECT u.email, fp.display_name
FROM fighter_profile fp
JOIN "user" u ON u.id = fp.user_id
WHERE NOT EXISTS (
  SELECT 1
  FROM team_membership m
  WHERE m.user_id = u.id
    AND m.member_kind = 'fighter'
    AND m.status = 'active'
)
ORDER BY u.email;
```

---

## Audit trail

`audit_event.payload` is JSON (often includes `team_id`, `membership_id`, etc.).

### Recent audit events (last 50)

```sql
SELECT
  ae.id,
  ae.event_type,
  actor.email AS actor_email,
  target.email AS target_email,
  ae.payload,
  ae.created_at
FROM audit_event ae
LEFT JOIN "user" actor ON actor.id = ae.actor_user_id
LEFT JOIN "user" target ON target.id = ae.target_user_id
ORDER BY ae.created_at DESC
LIMIT 50;
```

### Team-related audit for one team

```sql
SELECT
  ae.event_type,
  actor.email AS actor_email,
  target.email AS target_email,
  ae.payload,
  ae.created_at
FROM audit_event ae
LEFT JOIN "user" actor ON actor.id = ae.actor_user_id
LEFT JOIN "user" target ON target.id = ae.target_user_id
WHERE ae.payload->>'team_id' = (
  SELECT id::text FROM team WHERE slug = 'your-team-slug'
)
ORDER BY ae.created_at DESC;
```

### Membership events for a user

```sql
SELECT ae.event_type, ae.payload, ae.created_at
FROM audit_event ae
JOIN "user" u ON u.id = ae.target_user_id
WHERE u.email = 'fighter@example.com'
  AND ae.event_type LIKE 'membership.%'
ORDER BY ae.created_at DESC;
```

### Count audit events by type (last 7 days)

```sql
SELECT event_type, COUNT(*) AS n
FROM audit_event
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY event_type
ORDER BY n DESC;
```

---

## Quick health checks

```sql
-- row counts
SELECT 'team' AS entity, COUNT(*) FROM team
UNION ALL SELECT 'team_membership', COUNT(*) FROM team_membership
UNION ALL SELECT 'team_captain_assignment (active)', COUNT(*)
  FROM team_captain_assignment WHERE valid_to IS NULL
UNION ALL SELECT 'user', COUNT(*) FROM "user"
UNION ALL SELECT 'fighter_profile', COUNT(*) FROM fighter_profile
UNION ALL SELECT 'audit_event', COUNT(*) FROM audit_event;
```

```sql
-- teams missing slug (if you rely on slugs in URLs)
SELECT id, name, status FROM team WHERE slug IS NULL OR slug = '';
```
