import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventRegistrations, events } from "@/lib/db/schema";
import { EVENT_AUDIT_EVENT_TYPES, writeEventAuditEvent } from "@/lib/events/audit";
import type {
  EventListItem,
  EventResponse,
} from "@/lib/events/contracts";
import { mapEvent, mapEventListItem } from "@/lib/events/projections";
import { userHasGlobalOrganizerRole } from "@/lib/events/permissions";
import { DEFAULT_EVENT_TIMEZONE, parseLocalDateTimeInZone } from "@/lib/events/timezone";
import type { z } from "zod";
import type {
  eventCancelRequestSchema,
  eventCreateRequestSchema,
  eventOrganizerReassignRequestSchema,
  eventPublishRequestSchema,
  eventSanctionRequestSchema,
  eventUpdateRequestSchema,
} from "@/lib/events/contracts";

type CreateInput = z.infer<typeof eventCreateRequestSchema>;
type UpdateInput = z.infer<typeof eventUpdateRequestSchema>;
type PublishInput = z.infer<typeof eventPublishRequestSchema>;
type CancelInput = z.infer<typeof eventCancelRequestSchema>;
type SanctionInput = z.infer<typeof eventSanctionRequestSchema>;
type ReassignInput = z.infer<typeof eventOrganizerReassignRequestSchema>;

export type EventServiceError =
  | "not_found"
  | "forbidden"
  | "invalid_transition"
  | "target_not_organizer";

function parseInstant(input: string, zone: string): Date {
  return parseLocalDateTimeInZone(input, zone);
}

export async function createEvent(
  input: CreateInput,
  actorUserId: string,
): Promise<EventResponse> {
  const zone = input.timezone ?? DEFAULT_EVENT_TIMEZONE;
  const [row] = await db
    .insert(events)
    .values({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      timezone: zone,
      startsAt: parseInstant(input.startsAt, zone),
      endsAt: input.endsAt ? parseInstant(input.endsAt, zone) : null,
      venueLabel: input.venueLabel.trim(),
      lifecycleStatus: "draft",
      organizerUserId: actorUserId,
      createdByUserId: actorUserId,
      registrationOpensAt: input.registrationOpensAt
        ? parseInstant(input.registrationOpensAt, zone)
        : null,
      registrationClosesAt: input.registrationClosesAt
        ? parseInstant(input.registrationClosesAt, zone)
        : null,
      fighterCapacity: input.fighterCapacity ?? null,
      staffCapacity: input.staffCapacity ?? null,
      fighterConfirmationRequiredDaysBefore:
        input.fighterConfirmationRequiredDaysBefore ?? null,
    })
    .returning();

  await writeEventAuditEvent({
    eventType: EVENT_AUDIT_EVENT_TYPES.eventCreated,
    actorUserId,
    payload: { event_id: row.id, status_after: row.lifecycleStatus },
  });

  return mapEvent(row);
}

export async function listPublishedUpcomingEvents(opts?: {
  from?: Date;
  limit?: number;
}): Promise<EventListItem[]> {
  const from = opts?.from ?? new Date();
  const limit = opts?.limit ?? 50;
  const rows = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.lifecycleStatus, "published"),
        gte(events.startsAt, from),
      ),
    )
    .orderBy(asc(events.startsAt))
    .limit(limit);
  return rows.map(mapEventListItem);
}

export async function getEventById(eventId: string): Promise<EventResponse | null> {
  const [row] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  return row ? mapEvent(row) : null;
}

export async function getEventRow(eventId: string) {
  const [row] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  return row ?? null;
}

export async function updateEvent(
  eventId: string,
  input: UpdateInput,
  actorUserId: string,
): Promise<{ event: EventResponse | null; error?: EventServiceError }> {
  const existing = await getEventRow(eventId);
  if (!existing) return { event: null, error: "not_found" };

  const zone = input.timezone ?? existing.timezone;
  const patch: Partial<typeof events.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) patch.description = input.description;
  if (input.timezone !== undefined) patch.timezone = input.timezone;
  if (input.startsAt !== undefined) patch.startsAt = parseInstant(input.startsAt, zone);
  if (input.endsAt !== undefined)
    patch.endsAt = input.endsAt ? parseInstant(input.endsAt, zone) : null;
  if (input.venueLabel !== undefined) patch.venueLabel = input.venueLabel.trim();
  if (input.registrationOpensAt !== undefined)
    patch.registrationOpensAt = input.registrationOpensAt
      ? parseInstant(input.registrationOpensAt, zone)
      : null;
  if (input.registrationClosesAt !== undefined)
    patch.registrationClosesAt = input.registrationClosesAt
      ? parseInstant(input.registrationClosesAt, zone)
      : null;
  if (input.fighterCapacity !== undefined) patch.fighterCapacity = input.fighterCapacity;
  if (input.staffCapacity !== undefined) patch.staffCapacity = input.staffCapacity;
  if (input.fighterConfirmationRequiredDaysBefore !== undefined)
    patch.fighterConfirmationRequiredDaysBefore = input.fighterConfirmationRequiredDaysBefore;

  const [row] = await db.update(events).set(patch).where(eq(events.id, eventId)).returning();

  await writeEventAuditEvent({
    eventType: EVENT_AUDIT_EVENT_TYPES.eventUpdated,
    actorUserId,
    payload: { event_id: eventId },
  });

  return { event: mapEvent(row) };
}

export async function publishEvent(
  eventId: string,
  input: PublishInput,
  actorUserId: string,
): Promise<{ event: EventResponse | null; error?: EventServiceError }> {
  const existing = await getEventRow(eventId);
  if (!existing) return { event: null, error: "not_found" };
  if (existing.lifecycleStatus !== "draft") {
    return { event: null, error: "invalid_transition" };
  }

  const zone = existing.timezone;
  const now = new Date();
  const [row] = await db
    .update(events)
    .set({
      lifecycleStatus: "published",
      publishedAt: now,
      updatedAt: now,
      registrationOpensAt: input.registrationOpensAt
        ? parseInstant(input.registrationOpensAt, zone)
        : existing.registrationOpensAt,
      registrationClosesAt: input.registrationClosesAt
        ? parseInstant(input.registrationClosesAt, zone)
        : existing.registrationClosesAt,
    })
    .where(eq(events.id, eventId))
    .returning();

  await writeEventAuditEvent({
    eventType: EVENT_AUDIT_EVENT_TYPES.eventPublished,
    actorUserId,
    payload: { event_id: eventId, status_after: "published" },
  });

  return { event: mapEvent(row) };
}

export async function closeRegistration(
  eventId: string,
  actorUserId: string,
): Promise<{ event: EventResponse | null; error?: EventServiceError }> {
  const existing = await getEventRow(eventId);
  if (!existing) return { event: null, error: "not_found" };
  if (existing.lifecycleStatus !== "published") {
    return { event: null, error: "invalid_transition" };
  }

  const [row] = await db
    .update(events)
    .set({ lifecycleStatus: "registration_closed", updatedAt: new Date() })
    .where(eq(events.id, eventId))
    .returning();

  await writeEventAuditEvent({
    eventType: EVENT_AUDIT_EVENT_TYPES.eventRegistrationClosed,
    actorUserId,
    payload: { event_id: eventId },
  });

  return { event: mapEvent(row) };
}

export async function reopenRegistration(
  eventId: string,
  actorUserId: string,
): Promise<{ event: EventResponse | null; error?: EventServiceError }> {
  const existing = await getEventRow(eventId);
  if (!existing) return { event: null, error: "not_found" };
  if (existing.lifecycleStatus !== "registration_closed") {
    return { event: null, error: "invalid_transition" };
  }

  const [row] = await db
    .update(events)
    .set({ lifecycleStatus: "published", updatedAt: new Date() })
    .where(eq(events.id, eventId))
    .returning();

  await writeEventAuditEvent({
    eventType: EVENT_AUDIT_EVENT_TYPES.eventRegistrationReopened,
    actorUserId,
    payload: { event_id: eventId },
  });

  return { event: mapEvent(row) };
}

export async function startEvent(
  eventId: string,
  actorUserId: string,
): Promise<{ event: EventResponse | null; error?: EventServiceError }> {
  const existing = await getEventRow(eventId);
  if (!existing) return { event: null, error: "not_found" };
  if (!["published", "registration_closed"].includes(existing.lifecycleStatus)) {
    return { event: null, error: "invalid_transition" };
  }

  const [row] = await db
    .update(events)
    .set({ lifecycleStatus: "in_progress", updatedAt: new Date() })
    .where(eq(events.id, eventId))
    .returning();

  await writeEventAuditEvent({
    eventType: EVENT_AUDIT_EVENT_TYPES.eventStarted,
    actorUserId,
    payload: { event_id: eventId },
  });

  return { event: mapEvent(row) };
}

export async function completeEvent(
  eventId: string,
  actorUserId: string,
): Promise<{ event: EventResponse | null; error?: EventServiceError }> {
  const existing = await getEventRow(eventId);
  if (!existing) return { event: null, error: "not_found" };
  if (existing.lifecycleStatus !== "in_progress") {
    return { event: null, error: "invalid_transition" };
  }

  const [row] = await db
    .update(events)
    .set({ lifecycleStatus: "completed", updatedAt: new Date() })
    .where(eq(events.id, eventId))
    .returning();

  await writeEventAuditEvent({
    eventType: EVENT_AUDIT_EVENT_TYPES.eventCompleted,
    actorUserId,
    payload: { event_id: eventId },
  });

  return { event: mapEvent(row) };
}

export async function cancelEvent(
  eventId: string,
  input: CancelInput,
  actorUserId: string,
): Promise<{ event: EventResponse | null; error?: EventServiceError }> {
  const existing = await getEventRow(eventId);
  if (!existing) return { event: null, error: "not_found" };
  if (!["draft", "published", "registration_closed"].includes(existing.lifecycleStatus)) {
    return { event: null, error: "invalid_transition" };
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(events)
      .set({
        lifecycleStatus: "cancelled",
        cancelledAt: now,
        cancellationReason: input.reason?.trim() || null,
        updatedAt: now,
      })
      .where(eq(events.id, eventId));

    await tx
      .update(eventRegistrations)
      .set({ status: "cancelled", updatedAt: now })
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          inArray(eventRegistrations.status, ["submitted", "confirmed", "waitlisted"]),
        ),
      );
  });

  const row = await getEventRow(eventId);
  await writeEventAuditEvent({
    eventType: EVENT_AUDIT_EVENT_TYPES.eventCancelled,
    actorUserId,
    payload: { event_id: eventId, reason: input.reason },
  });

  return { event: row ? mapEvent(row) : null };
}

export async function sanctionEvent(
  eventId: string,
  input: SanctionInput,
  actorUserId: string,
): Promise<{ event: EventResponse | null; error?: EventServiceError }> {
  const existing = await getEventRow(eventId);
  if (!existing) return { event: null, error: "not_found" };

  const [row] = await db
    .update(events)
    .set({
      isSanctioned: true,
      sanctioningNotes: input.sanctioningNotes?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventId))
    .returning();

  await writeEventAuditEvent({
    eventType: EVENT_AUDIT_EVENT_TYPES.eventSanctioned,
    actorUserId,
    payload: { event_id: eventId },
  });

  return { event: mapEvent(row) };
}

export async function revokeEventSanction(
  eventId: string,
  actorUserId: string,
): Promise<{ event: EventResponse | null; error?: EventServiceError }> {
  const existing = await getEventRow(eventId);
  if (!existing) return { event: null, error: "not_found" };

  const [row] = await db
    .update(events)
    .set({ isSanctioned: false, updatedAt: new Date() })
    .where(eq(events.id, eventId))
    .returning();

  await writeEventAuditEvent({
    eventType: EVENT_AUDIT_EVENT_TYPES.eventSanctionRevoked,
    actorUserId,
    payload: { event_id: eventId },
  });

  return { event: mapEvent(row) };
}

export async function reassignOrganizer(
  eventId: string,
  input: ReassignInput,
  actorUserId: string,
): Promise<{ event: EventResponse | null; error?: EventServiceError }> {
  const existing = await getEventRow(eventId);
  if (!existing) return { event: null, error: "not_found" };

  const hasOrganizer = await userHasGlobalOrganizerRole(input.newOrganizerUserId);
  if (!hasOrganizer) return { event: null, error: "target_not_organizer" };

  const prior = existing.organizerUserId;
  const [row] = await db
    .update(events)
    .set({ organizerUserId: input.newOrganizerUserId, updatedAt: new Date() })
    .where(eq(events.id, eventId))
    .returning();

  await writeEventAuditEvent({
    eventType: EVENT_AUDIT_EVENT_TYPES.eventOrganizerReassigned,
    actorUserId,
    targetUserId: input.newOrganizerUserId,
    payload: {
      event_id: eventId,
      prior_organizer_user_id: prior,
      new_organizer_user_id: input.newOrganizerUserId,
    },
  });

  return { event: mapEvent(row) };
}

export async function listPublicPublishedEvents(limit = 50): Promise<EventListItem[]> {
  const from = new Date();
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.lifecycleStatus, "published"), gte(events.startsAt, from)))
    .orderBy(asc(events.startsAt))
    .limit(limit);
  return rows.map(mapEventListItem);
}

export async function listOrganizerEvents(
  userId: string,
  isFacAdmin: boolean,
): Promise<EventResponse[]> {
  const rows = isFacAdmin
    ? await db.select().from(events).orderBy(asc(events.startsAt))
    : await db
        .select()
        .from(events)
        .where(eq(events.organizerUserId, userId))
        .orderBy(asc(events.startsAt));
  return rows.map(mapEvent);
}
