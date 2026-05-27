import type {
  EventListItem,
  EventRegistrationResponse,
  EventResponse,
  PublicEventListItem,
  ScheduleChangeRecordResponse,
  ScheduleEntryResponse,
} from "@/lib/events/contracts";
import { toIsoUtc } from "@/lib/events/timezone";
import type {
  eventRegistrations,
  events,
  scheduleChangeRecords,
  scheduleEntries,
} from "@/lib/db/schema";

type EventRow = typeof events.$inferSelect;
type RegistrationRow = typeof eventRegistrations.$inferSelect;
type ScheduleEntryRow = typeof scheduleEntries.$inferSelect;
type ScheduleChangeRow = typeof scheduleChangeRecords.$inferSelect;

export function mapEvent(row: EventRow): EventResponse {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    timezone: row.timezone,
    startsAt: toIsoUtc(row.startsAt),
    endsAt: row.endsAt ? toIsoUtc(row.endsAt) : null,
    venueLabel: row.venueLabel,
    lifecycleStatus: row.lifecycleStatus,
    isSanctioned: row.isSanctioned,
    sanctioningNotes: row.sanctioningNotes,
    organizerUserId: row.organizerUserId,
    registrationOpensAt: row.registrationOpensAt ? toIsoUtc(row.registrationOpensAt) : null,
    registrationClosesAt: row.registrationClosesAt ? toIsoUtc(row.registrationClosesAt) : null,
    fighterCapacity: row.fighterCapacity,
    staffCapacity: row.staffCapacity ?? null,
    fighterConfirmationRequiredDaysBefore: row.fighterConfirmationRequiredDaysBefore,
    publishedAt: row.publishedAt ? toIsoUtc(row.publishedAt) : null,
    cancelledAt: row.cancelledAt ? toIsoUtc(row.cancelledAt) : null,
    cancellationReason: row.cancellationReason,
  };
}

export function mapEventListItem(row: EventRow): EventListItem {
  return {
    id: row.id,
    name: row.name,
    startsAt: toIsoUtc(row.startsAt),
    venueLabel: row.venueLabel,
    timezone: row.timezone,
    lifecycleStatus: row.lifecycleStatus,
    isSanctioned: row.isSanctioned,
  };
}

export function mapPublicEvent(row: EventRow): PublicEventListItem {
  return {
    id: row.id,
    name: row.name,
    startsAt: toIsoUtc(row.startsAt),
    venueLabel: row.venueLabel,
    timezone: row.timezone,
  };
}

export function mapRegistration(row: RegistrationRow): EventRegistrationResponse {
  return {
    id: row.id,
    eventId: row.eventId,
    userId: row.userId,
    registrationKind: row.registrationKind,
    staffOperationalRoleKey: row.staffOperationalRoleKey,
    status: row.status,
    teamId: row.teamId,
    teamNameSnapshot: row.teamNameSnapshot,
    confirmedAt: row.confirmedAt ? toIsoUtc(row.confirmedAt) : null,
    waitlistedAt: row.waitlistedAt ? toIsoUtc(row.waitlistedAt) : null,
  };
}

export function mapScheduleEntry(row: ScheduleEntryRow): ScheduleEntryResponse {
  return {
    id: row.id,
    eventId: row.eventId,
    label: row.label,
    scheduledStartAt: toIsoUtc(row.scheduledStartAt),
    scheduledEndAt: row.scheduledEndAt ? toIsoUtc(row.scheduledEndAt) : null,
    status: row.status,
    venueLabelOverride: row.venueLabelOverride,
    eventRegistrationId: row.eventRegistrationId,
    placeholderLabel: row.placeholderLabel,
    sortOrder: row.sortOrder,
  };
}

export function mapScheduleChange(row: ScheduleChangeRow): ScheduleChangeRecordResponse {
  return {
    id: row.id,
    scheduleEntryId: row.scheduleEntryId,
    fieldName: row.fieldName,
    priorValue: row.priorValue,
    newValue: row.newValue,
    reason: row.reason,
    actorUserId: row.actorUserId,
    createdAt: toIsoUtc(row.createdAt),
  };
}
