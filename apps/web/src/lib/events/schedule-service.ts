import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scheduleChangeRecords, scheduleEntries } from "@/lib/db/schema";
import { EVENT_AUDIT_EVENT_TYPES, writeEventAuditEvent } from "@/lib/events/audit";
import type {
  EventScheduleResponse,
  ScheduleChangeRecordResponse,
  ScheduleEntryResponse,
  ScheduleEntryUpdateResult,
} from "@/lib/events/contracts";
import { getEventRow } from "@/lib/events/event-service";
import { mapScheduleChange, mapScheduleEntry } from "@/lib/events/projections";
import { parseLocalDateTimeInZone } from "@/lib/events/timezone";
import type { z } from "zod";
import type {
  scheduleEntryCreateRequestSchema,
  scheduleEntryUpdateRequestSchema,
} from "@/lib/events/contracts";

type CreateInput = z.infer<typeof scheduleEntryCreateRequestSchema>;
type UpdateInput = z.infer<typeof scheduleEntryUpdateRequestSchema>;

export type ScheduleServiceError =
  | "not_found"
  | "event_not_found"
  | "overlap_unacknowledged"
  | "forbidden";

function entryWindow(
  start: Date,
  end: Date | null,
  durationMinutes: number | null,
): { startMs: number; endMs: number } {
  const startMs = start.getTime();
  let endMs = end?.getTime() ?? startMs;
  if (durationMinutes != null) {
    endMs = startMs + durationMinutes * 60_000;
  } else if (!end) {
    endMs = startMs + 30 * 60_000;
  }
  return { startMs, endMs };
}

function detectOverlaps(
  entries: Array<{
    id: string;
    scheduledStartAt: Date;
    scheduledEndAt: Date | null;
    durationMinutes: number | null;
  }>,
  candidate: { id?: string; start: Date; end: Date | null; durationMinutes: number | null },
): string[] {
  const warnings: string[] = [];
  const cWin = entryWindow(candidate.start, candidate.end, candidate.durationMinutes);
  for (const e of entries) {
    if (e.id === candidate.id) continue;
    const eWin = entryWindow(e.scheduledStartAt, e.scheduledEndAt, e.durationMinutes);
    if (cWin.startMs < eWin.endMs && eWin.startMs < cWin.endMs) {
      warnings.push(`Overlaps with entry ${e.id}`);
    }
  }
  return warnings;
}

async function writeFieldChange(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    scheduleEntryId: string;
    eventId: string;
    fieldName: string;
    priorValue: string | null;
    newValue: string | null;
    reason?: string;
    actorUserId: string;
  },
) {
  await tx.insert(scheduleChangeRecords).values({
    scheduleEntryId: input.scheduleEntryId,
    eventId: input.eventId,
    fieldName: input.fieldName,
    priorValue: input.priorValue,
    newValue: input.newValue,
    reason: input.reason ?? null,
    actorUserId: input.actorUserId,
  });
}

export async function listBoard(eventId: string): Promise<EventScheduleResponse | null> {
  const event = await getEventRow(eventId);
  if (!event) return null;

  const rows = await db
    .select()
    .from(scheduleEntries)
    .where(eq(scheduleEntries.eventId, eventId))
    .orderBy(asc(scheduleEntries.scheduledStartAt), asc(scheduleEntries.sortOrder));

  return {
    timezone: event.timezone,
    schedulePublished: rows.length > 0,
    entries: rows.map(mapScheduleEntry),
  };
}

export async function createEntry(
  eventId: string,
  input: CreateInput,
  actorUserId: string,
): Promise<{ result?: ScheduleEntryResponse; warnings?: string[]; error?: ScheduleServiceError }> {
  const event = await getEventRow(eventId);
  if (!event) return { error: "event_not_found" };

  const start = parseLocalDateTimeInZone(input.scheduledStartAt, event.timezone);
  const end = input.scheduledEndAt
    ? parseLocalDateTimeInZone(input.scheduledEndAt, event.timezone)
    : null;

  const existing = await db
    .select()
    .from(scheduleEntries)
    .where(eq(scheduleEntries.eventId, eventId));

  const warnings = detectOverlaps(existing, {
    start,
    end,
    durationMinutes: input.durationMinutes ?? null,
  });
  if (warnings.length > 0 && !input.acknowledgeScheduleWarnings) {
    return { error: "overlap_unacknowledged", warnings };
  }

  const [row] = await db
    .insert(scheduleEntries)
    .values({
      eventId,
      label: input.label.trim(),
      scheduledStartAt: start,
      scheduledEndAt: end,
      durationMinutes: input.durationMinutes ?? null,
      eventRegistrationId: input.eventRegistrationId ?? null,
      placeholderLabel: input.placeholderLabel?.trim() || null,
      sortOrder: input.sortOrder ?? existing.length,
      status: "planned",
    })
    .returning();

  await writeEventAuditEvent({
    eventType: EVENT_AUDIT_EVENT_TYPES.scheduleEntryCreated,
    actorUserId,
    payload: { event_id: eventId, schedule_entry_id: row.id },
  });

  return { result: mapScheduleEntry(row), warnings };
}

export async function updateEntry(
  eventId: string,
  entryId: string,
  input: UpdateInput,
  actorUserId: string,
): Promise<{ result?: ScheduleEntryUpdateResult; error?: ScheduleServiceError }> {
  const event = await getEventRow(eventId);
  if (!event) return { error: "event_not_found" };

  const [existing] = await db
    .select()
    .from(scheduleEntries)
    .where(and(eq(scheduleEntries.id, entryId), eq(scheduleEntries.eventId, eventId)))
    .limit(1);
  if (!existing) return { error: "not_found" };

  const zone = event.timezone;
  const patch: Partial<typeof scheduleEntries.$inferInsert> = { updatedAt: new Date() };
  const changes: Array<{
    fieldName: string;
    prior: string | null;
    next: string | null;
  }> = [];

  if (input.label !== undefined && input.label !== existing.label) {
    patch.label = input.label.trim();
    changes.push({
      fieldName: "label",
      prior: existing.label,
      next: patch.label,
    });
  }
  if (input.scheduledStartAt !== undefined) {
    const next = parseLocalDateTimeInZone(input.scheduledStartAt, zone);
    if (next.getTime() !== existing.scheduledStartAt.getTime()) {
      patch.scheduledStartAt = next;
      changes.push({
        fieldName: "scheduled_start_at",
        prior: existing.scheduledStartAt.toISOString(),
        next: next.toISOString(),
      });
    }
  }
  if (input.scheduledEndAt !== undefined) {
    const next = input.scheduledEndAt
      ? parseLocalDateTimeInZone(input.scheduledEndAt, zone)
      : null;
    patch.scheduledEndAt = next;
    changes.push({
      fieldName: "scheduled_end_at",
      prior: existing.scheduledEndAt?.toISOString() ?? null,
      next: next?.toISOString() ?? null,
    });
  }
  if (input.durationMinutes !== undefined) {
    patch.durationMinutes = input.durationMinutes;
    changes.push({
      fieldName: "duration_minutes",
      prior: existing.durationMinutes?.toString() ?? null,
      next: input.durationMinutes?.toString() ?? null,
    });
  }
  if (input.status !== undefined && input.status !== existing.status) {
    patch.status = input.status;
    changes.push({
      fieldName: "status",
      prior: existing.status,
      next: input.status,
    });
  }
  if (input.venueLabelOverride !== undefined) {
    patch.venueLabelOverride = input.venueLabelOverride;
    changes.push({
      fieldName: "venue_label_override",
      prior: existing.venueLabelOverride,
      next: input.venueLabelOverride,
    });
  }

  const mergedStart = patch.scheduledStartAt ?? existing.scheduledStartAt;
  const mergedEnd =
    patch.scheduledEndAt !== undefined ? patch.scheduledEndAt : existing.scheduledEndAt;
  const mergedDuration =
    patch.durationMinutes !== undefined ? patch.durationMinutes : existing.durationMinutes;

  const allEntries = await db
    .select()
    .from(scheduleEntries)
    .where(eq(scheduleEntries.eventId, eventId));

  const warnings = detectOverlaps(allEntries, {
    id: entryId,
    start: mergedStart,
    end: mergedEnd,
    durationMinutes: mergedDuration,
  });
  if (warnings.length > 0 && !input.acknowledgeScheduleWarnings) {
    return { error: "overlap_unacknowledged" };
  }

  const [row] = await db
    .update(scheduleEntries)
    .set(patch)
    .where(eq(scheduleEntries.id, entryId))
    .returning();

  if (changes.length > 0) {
    await db.transaction(async (tx) => {
      for (const c of changes) {
        await writeFieldChange(tx, {
          scheduleEntryId: entryId,
          eventId,
          fieldName: c.fieldName,
          priorValue: c.prior,
          newValue: c.next,
          reason: input.reason,
          actorUserId,
        });
      }
    });

    await writeEventAuditEvent({
      eventType:
        input.status === "cancelled"
          ? EVENT_AUDIT_EVENT_TYPES.scheduleEntryCancelled
          : EVENT_AUDIT_EVENT_TYPES.scheduleEntryUpdated,
      actorUserId,
      payload: { event_id: eventId, schedule_entry_id: entryId },
    });
  }

  return {
    result: {
      entry: mapScheduleEntry(row),
      warnings,
    },
  };
}

export async function listScheduleChanges(
  eventId: string,
): Promise<ScheduleChangeRecordResponse[]> {
  const rows = await db
    .select()
    .from(scheduleChangeRecords)
    .where(eq(scheduleChangeRecords.eventId, eventId))
    .orderBy(asc(scheduleChangeRecords.createdAt));
  return rows.map(mapScheduleChange);
}
