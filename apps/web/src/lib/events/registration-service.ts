import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  eventRegistrations,
  events,
  fighterProfiles,
  users,
} from "@/lib/db/schema";
import { EVENT_AUDIT_EVENT_TYPES, writeEventAuditEvent } from "@/lib/events/audit";
import { getFighterAffiliationSnapshot } from "@/lib/events/affiliation-snapshot";
import type {
  EventRegistrationResponse,
  EventRegistrationSummaryResponse,
  MyEventRegistrationsResponse,
} from "@/lib/events/contracts";
import { isRegistrationOpen } from "@/lib/events/permissions";
import { mapRegistration } from "@/lib/events/projections";
import { getEventRow } from "@/lib/events/event-service";

export type RegistrationServiceError =
  | "event_not_found"
  | "registration_not_found"
  | "user_disabled"
  | "fighter_profile_required"
  | "staff_role_required"
  | "registration_closed"
  | "duplicate_registration"
  | "confirmation_not_applicable"
  | "forbidden";

const ACTIVE_STATUSES = ["submitted", "confirmed", "waitlisted"] as const;

export type WaitlistPromotionPolicy = {
  promoteNext: (
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    eventId: string,
  ) => Promise<void>;
};

/** Default FIFO promotion by waitlisted_at ascending. */
export const fifoWaitlistPromotionPolicy: WaitlistPromotionPolicy = {
  async promoteNext(tx, eventId) {
    const [event] = await tx.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) return;

    const [{ value: occupied }] = await tx
      .select({ value: count() })
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.registrationKind, "fighter"),
          inArray(eventRegistrations.status, ["submitted", "confirmed"]),
        ),
      );

    const capacity = event.fighterCapacity;
    if (capacity != null && Number(occupied) >= capacity) return;

    const [next] = await tx
      .select()
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.registrationKind, "fighter"),
          eq(eventRegistrations.status, "waitlisted"),
        ),
      )
      .orderBy(asc(eventRegistrations.waitlistedAt))
      .limit(1);

    if (!next) return;

    const now = new Date();
    const needsConfirmation = event.fighterConfirmationRequiredDaysBefore != null;
    await tx
      .update(eventRegistrations)
      .set({
        status: needsConfirmation ? "submitted" : "confirmed",
        confirmedAt: needsConfirmation ? null : now,
        waitlistedAt: null,
        updatedAt: now,
      })
      .where(eq(eventRegistrations.id, next.id));
  },
};

async function assertUserActive(userId: string): Promise<RegistrationServiceError | null> {
  const [u] = await db.select({ status: users.status }).from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.status === "disabled") return "user_disabled";
  return null;
}

async function assertFighterProfile(userId: string): Promise<RegistrationServiceError | null> {
  const [fp] = await db
    .select({ id: fighterProfiles.id })
    .from(fighterProfiles)
    .where(eq(fighterProfiles.userId, userId))
    .limit(1);
  if (!fp) return "fighter_profile_required";
  return null;
}

async function countFighterSlots(eventId: string): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.registrationKind, "fighter"),
        inArray(eventRegistrations.status, ["submitted", "confirmed"]),
      ),
    );
  return Number(value);
}

async function findActiveRegistration(
  eventId: string,
  userId: string,
  kind: "fighter" | "staff",
  staffRoleKey?: string,
) {
  const conditions = [
    eq(eventRegistrations.eventId, eventId),
    eq(eventRegistrations.userId, userId),
    eq(eventRegistrations.registrationKind, kind),
    inArray(eventRegistrations.status, [...ACTIVE_STATUSES]),
  ];
  if (kind === "staff" && staffRoleKey) {
    conditions.push(eq(eventRegistrations.staffOperationalRoleKey, staffRoleKey));
  }
  const [row] = await db
    .select()
    .from(eventRegistrations)
    .where(and(...conditions))
    .limit(1);
  return row ?? null;
}

type RegisterFighterOpts = {
  onBehalf?: boolean;
  organizerOverride?: boolean;
  waitlistPolicy?: WaitlistPromotionPolicy;
};

async function registerFighterInternal(
  eventId: string,
  userId: string,
  actorUserId: string,
  opts: RegisterFighterOpts = {},
): Promise<{ registration?: EventRegistrationResponse; error?: RegistrationServiceError }> {
  const event = await getEventRow(eventId);
  if (!event) return { error: "event_not_found" };

  if (!opts.organizerOverride && !isRegistrationOpen(event)) {
    return { error: "registration_closed" };
  }

  const userErr = await assertUserActive(userId);
  if (userErr) return { error: userErr };

  const fpErr = await assertFighterProfile(userId);
  if (fpErr) return { error: fpErr };

  const existing = await findActiveRegistration(eventId, userId, "fighter");
  if (existing) return { error: "duplicate_registration" };

  const capacity = event.fighterCapacity;
  const occupied = await countFighterSlots(eventId);
  const atCapacity = capacity != null && occupied >= capacity;
  const needsConfirmation = event.fighterConfirmationRequiredDaysBefore != null;
  const now = new Date();

  let registration: EventRegistrationResponse | undefined;

  await db.transaction(async (tx) => {
    const status = atCapacity
      ? "waitlisted"
      : needsConfirmation
        ? "submitted"
        : "confirmed";

    const snapshot =
      status === "confirmed" || status === "submitted"
        ? await getFighterAffiliationSnapshot(userId)
        : {};

    const [row] = await tx
      .insert(eventRegistrations)
      .values({
        eventId,
        userId,
        registrationKind: "fighter",
        status,
        submittedAt: now,
        confirmedAt: status === "confirmed" ? now : null,
        waitlistedAt: status === "waitlisted" ? now : null,
        teamId: snapshot.teamId ?? null,
        teamMembershipId: snapshot.teamMembershipId ?? null,
        teamNameSnapshot: snapshot.teamNameSnapshot ?? null,
      })
      .returning();

    registration = mapRegistration(row);

    const auditType =
      status === "waitlisted"
        ? EVENT_AUDIT_EVENT_TYPES.registrationFighterWaitlisted
        : opts.onBehalf
          ? EVENT_AUDIT_EVENT_TYPES.registrationFighterOnBehalf
          : EVENT_AUDIT_EVENT_TYPES.registrationFighterConfirmed;

    await writeEventAuditEvent({
      eventType: auditType,
      actorUserId,
      targetUserId: userId,
      payload: {
        event_id: eventId,
        registration_id: row.id,
        status_after: status,
      },
    });
  });

  return { registration };
}

export async function registerFighter(
  eventId: string,
  userId: string,
): Promise<{ registration?: EventRegistrationResponse; error?: RegistrationServiceError }> {
  return registerFighterInternal(eventId, userId, userId);
}

export async function registerFighterOnBehalf(
  eventId: string,
  targetUserId: string,
  actorUserId: string,
): Promise<{ registration?: EventRegistrationResponse; error?: RegistrationServiceError }> {
  return registerFighterInternal(eventId, targetUserId, actorUserId, {
    onBehalf: true,
    organizerOverride: true,
  });
}

export async function confirmFighterAttendance(
  eventId: string,
  userId: string,
): Promise<{ registration?: EventRegistrationResponse; error?: RegistrationServiceError }> {
  const event = await getEventRow(eventId);
  if (!event) return { error: "event_not_found" };
  if (event.fighterConfirmationRequiredDaysBefore == null) {
    return { error: "confirmation_not_applicable" };
  }

  const row = await findActiveRegistration(eventId, userId, "fighter");
  if (!row || row.status !== "submitted") {
    return { error: "confirmation_not_applicable" };
  }

  const now = new Date();
  const snapshot = await getFighterAffiliationSnapshot(userId);
  const [updated] = await db
    .update(eventRegistrations)
    .set({
      status: "confirmed",
      confirmedAt: now,
      updatedAt: now,
      teamId: snapshot.teamId ?? row.teamId,
      teamMembershipId: snapshot.teamMembershipId ?? row.teamMembershipId,
      teamNameSnapshot: snapshot.teamNameSnapshot ?? row.teamNameSnapshot,
    })
    .where(eq(eventRegistrations.id, row.id))
    .returning();

  await writeEventAuditEvent({
    eventType: EVENT_AUDIT_EVENT_TYPES.registrationFighterConfirmed,
    actorUserId: userId,
    payload: { event_id: eventId, registration_id: updated.id },
  });

  return { registration: mapRegistration(updated) };
}

export async function withdrawFighter(
  eventId: string,
  userId: string,
  opts?: { organizerOverride?: boolean; waitlistPolicy?: WaitlistPromotionPolicy },
): Promise<{ registration?: EventRegistrationResponse; error?: RegistrationServiceError }> {
  const event = await getEventRow(eventId);
  if (!event) return { error: "event_not_found" };
  if (!opts?.organizerOverride && event.lifecycleStatus === "registration_closed") {
    return { error: "registration_closed" };
  }

  const row = await findActiveRegistration(eventId, userId, "fighter");
  if (!row) return { error: "registration_not_found" };

  const policy = opts?.waitlistPolicy ?? fifoWaitlistPromotionPolicy;
  const now = new Date();
  let updated: typeof eventRegistrations.$inferSelect;

  await db.transaction(async (tx) => {
    const [u] = await tx
      .update(eventRegistrations)
      .set({ status: "withdrawn", withdrawnAt: now, updatedAt: now })
      .where(eq(eventRegistrations.id, row.id))
      .returning();
    updated = u;
    if (row.status === "confirmed" || row.status === "submitted") {
      await policy.promoteNext(tx, eventId);
    }
  });

  await writeEventAuditEvent({
    eventType: EVENT_AUDIT_EVENT_TYPES.registrationFighterWithdrawn,
    actorUserId: userId,
    payload: { event_id: eventId, registration_id: updated!.id },
  });

  return { registration: mapRegistration(updated!) };
}

export async function registerStaff(
  eventId: string,
  userId: string,
  operationalRoleKey: string,
  roleKeys: string[],
): Promise<{ registration?: EventRegistrationResponse; error?: RegistrationServiceError }> {
  const event = await getEventRow(eventId);
  if (!event) return { error: "event_not_found" };
  if (!isRegistrationOpen(event)) return { error: "registration_closed" };

  if (!roleKeys.includes(operationalRoleKey)) return { error: "staff_role_required" };

  const userErr = await assertUserActive(userId);
  if (userErr) return { error: userErr };

  const caps = event.staffCapacity ?? {};
  const cap = caps[operationalRoleKey];
  if (cap != null) {
    const [{ value }] = await db
      .select({ value: count() })
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.registrationKind, "staff"),
          eq(eventRegistrations.staffOperationalRoleKey, operationalRoleKey),
          inArray(eventRegistrations.status, [...ACTIVE_STATUSES]),
        ),
      );
    if (Number(value) >= cap) return { error: "registration_closed" };
  }

  const existing = await findActiveRegistration(eventId, userId, "staff", operationalRoleKey);
  if (existing) return { error: "duplicate_registration" };

  const now = new Date();
  const [row] = await db
    .insert(eventRegistrations)
    .values({
      eventId,
      userId,
      registrationKind: "staff",
      staffOperationalRoleKey: operationalRoleKey,
      status: "confirmed",
      submittedAt: now,
      confirmedAt: now,
    })
    .returning();

  await writeEventAuditEvent({
    eventType: EVENT_AUDIT_EVENT_TYPES.registrationStaffConfirmed,
    actorUserId: userId,
    payload: {
      event_id: eventId,
      registration_id: row.id,
      staff_operational_role_key: operationalRoleKey,
    },
  });

  return { registration: mapRegistration(row) };
}

export async function withdrawStaff(
  eventId: string,
  userId: string,
  operationalRoleKey: string,
  opts?: { organizerOverride?: boolean },
): Promise<{ registration?: EventRegistrationResponse; error?: RegistrationServiceError }> {
  const event = await getEventRow(eventId);
  if (!event) return { error: "event_not_found" };
  if (!opts?.organizerOverride && event.lifecycleStatus === "registration_closed") {
    return { error: "registration_closed" };
  }

  const row = await findActiveRegistration(eventId, userId, "staff", operationalRoleKey);
  if (!row) return { error: "registration_not_found" };

  const now = new Date();
  const [updated] = await db
    .update(eventRegistrations)
    .set({ status: "withdrawn", withdrawnAt: now, updatedAt: now })
    .where(eq(eventRegistrations.id, row.id))
    .returning();

  await writeEventAuditEvent({
    eventType: EVENT_AUDIT_EVENT_TYPES.registrationStaffWithdrawn,
    actorUserId: userId,
    payload: { event_id: eventId, registration_id: updated.id },
  });

  return { registration: mapRegistration(updated) };
}

export async function withdrawRegistrationByOrganizer(
  eventId: string,
  registrationId: string,
  actorUserId: string,
  reason?: string,
  waitlistPolicy: WaitlistPromotionPolicy = fifoWaitlistPromotionPolicy,
): Promise<{ registration?: EventRegistrationResponse; error?: RegistrationServiceError }> {
  const [row] = await db
    .select()
    .from(eventRegistrations)
    .where(
      and(eq(eventRegistrations.id, registrationId), eq(eventRegistrations.eventId, eventId)),
    )
    .limit(1);
  if (!row || !ACTIVE_STATUSES.includes(row.status as (typeof ACTIVE_STATUSES)[number])) {
    return { error: "registration_not_found" };
  }

  const now = new Date();
  let updated: typeof eventRegistrations.$inferSelect;

  await db.transaction(async (tx) => {
    const [u] = await tx
      .update(eventRegistrations)
      .set({
        status: "withdrawn",
        withdrawnAt: now,
        withdrawnByUserId: actorUserId,
        withdrawalReason: reason?.trim() || null,
        updatedAt: now,
      })
      .where(eq(eventRegistrations.id, registrationId))
      .returning();
    updated = u;
    if (
      row.registrationKind === "fighter" &&
      (row.status === "confirmed" || row.status === "submitted")
    ) {
      await waitlistPolicy.promoteNext(tx, eventId);
    }
  });

  await writeEventAuditEvent({
    eventType: EVENT_AUDIT_EVENT_TYPES.registrationWithdrawnByOrganizer,
    actorUserId,
    targetUserId: row.userId,
    payload: {
      event_id: eventId,
      registration_id: registrationId,
      reason,
    },
  });

  return { registration: mapRegistration(updated!) };
}

export async function getMyRegistrations(
  eventId: string,
  userId: string,
): Promise<MyEventRegistrationsResponse> {
  const rows = await db
    .select()
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.userId, userId),
        inArray(eventRegistrations.status, [...ACTIVE_STATUSES]),
      ),
    );

  const fighter = rows.find((r) => r.registrationKind === "fighter");
  const staff = rows.filter((r) => r.registrationKind === "staff");

  return {
    fighter: fighter ? mapRegistration(fighter) : undefined,
    staff: staff.map(mapRegistration),
  };
}

export async function listRegistrationSummary(
  eventId: string,
  filters?: { kind?: "fighter" | "staff"; status?: string },
): Promise<EventRegistrationSummaryResponse> {
  const conditions = [eq(eventRegistrations.eventId, eventId)];
  if (filters?.kind) conditions.push(eq(eventRegistrations.registrationKind, filters.kind));
  if (filters?.status) {
    conditions.push(
      eq(
        eventRegistrations.status,
        filters.status as (typeof eventRegistrations.$inferSelect)["status"],
      ),
    );
  }

  const rows = await db
    .select()
    .from(eventRegistrations)
    .where(and(...conditions))
    .orderBy(asc(eventRegistrations.submittedAt));

  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = `${row.registrationKind}:${row.status}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return {
    counts,
    registrations: rows.map(mapRegistration),
  };
}
