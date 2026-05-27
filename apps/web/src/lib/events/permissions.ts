import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventRegistrations, events } from "@/lib/db/schema";
import { getOperationalRoleKeysForUser } from "@/lib/rbac/operational-role-keys";

export const FAC_ADMIN_ROLE_KEY = "fac_admin";
export const ORGANIZER_ROLE_KEY = "organizer";

export type EventRow = typeof events.$inferSelect;

export function roleKeysInclude(keys: string[] | undefined, key: string): boolean {
  return (keys ?? []).includes(key);
}

export function canCreateEvent(roleKeys: string[]): boolean {
  return (
    roleKeysInclude(roleKeys, FAC_ADMIN_ROLE_KEY) ||
    roleKeysInclude(roleKeys, ORGANIZER_ROLE_KEY)
  );
}

export function canManageEvent(
  event: Pick<EventRow, "organizerUserId">,
  userId: string,
  roleKeys: string[],
): boolean {
  if (roleKeysInclude(roleKeys, FAC_ADMIN_ROLE_KEY)) return true;
  return event.organizerUserId === userId;
}

export function canSanctionEvent(roleKeys: string[]): boolean {
  return roleKeysInclude(roleKeys, FAC_ADMIN_ROLE_KEY);
}

export function canReassignOrganizer(roleKeys: string[]): boolean {
  return roleKeysInclude(roleKeys, FAC_ADMIN_ROLE_KEY);
}

export function isRegistrationOpen(event: EventRow, now = new Date()): boolean {
  if (event.lifecycleStatus !== "published") return false;
  if (event.registrationOpensAt && now < event.registrationOpensAt) return false;
  if (event.registrationClosesAt && now > event.registrationClosesAt) return false;
  return true;
}

export function canSelfRegisterFighter(event: EventRow): boolean {
  return isRegistrationOpen(event);
}

export function canSelfRegisterStaff(event: EventRow): boolean {
  return isRegistrationOpen(event);
}

export function canViewRegistrationSummary(
  event: Pick<EventRow, "organizerUserId">,
  userId: string,
  roleKeys: string[],
): boolean {
  return canManageEvent(event, userId, roleKeys);
}

export async function canViewScheduleAsParticipant(
  eventId: string,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: eventRegistrations.id })
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.userId, userId),
        inArray(eventRegistrations.status, ["submitted", "confirmed", "waitlisted"]),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function userHasGlobalOrganizerRole(userId: string): Promise<boolean> {
  const keys = await getOperationalRoleKeysForUser(userId);
  return keys.includes(ORGANIZER_ROLE_KEY);
}

export async function getEventById(eventId: string): Promise<EventRow | null> {
  const [row] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  return row ?? null;
}
