import { z } from "zod";

export const eventLifecycleStatusSchema = z.enum([
  "draft",
  "published",
  "registration_closed",
  "in_progress",
  "completed",
  "cancelled",
]);

export const registrationKindSchema = z.enum(["fighter", "staff"]);
export const registrationStatusSchema = z.enum([
  "submitted",
  "confirmed",
  "waitlisted",
  "withdrawn",
  "cancelled",
]);
export const scheduleEntryStatusSchema = z.enum(["planned", "delayed", "cancelled"]);

export const eventCreateRequestSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().max(10000).optional(),
  timezone: z.string().min(1).default("America/New_York"),
  startsAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
  endsAt: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
  venueLabel: z.string().min(1).max(500),
  registrationOpensAt: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
  registrationClosesAt: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
  fighterCapacity: z.number().int().min(1).optional(),
  staffCapacity: z.record(z.string(), z.number().int().min(0)).optional(),
  fighterConfirmationRequiredDaysBefore: z.number().int().min(1).optional(),
});

export const eventUpdateRequestSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  description: z.string().max(10000).nullable().optional(),
  timezone: z.string().min(1).optional(),
  startsAt: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
  endsAt: z.string().datetime({ offset: true }).or(z.string().min(1)).nullable().optional(),
  venueLabel: z.string().min(1).max(500).optional(),
  registrationOpensAt: z
    .string()
    .datetime({ offset: true })
    .or(z.string().min(1))
    .nullable()
    .optional(),
  registrationClosesAt: z
    .string()
    .datetime({ offset: true })
    .or(z.string().min(1))
    .nullable()
    .optional(),
  fighterCapacity: z.number().int().min(1).nullable().optional(),
  staffCapacity: z.record(z.string(), z.number().int().min(0)).nullable().optional(),
  fighterConfirmationRequiredDaysBefore: z.number().int().min(1).nullable().optional(),
});

export const eventPublishRequestSchema = z.object({
  registrationOpensAt: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
  registrationClosesAt: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
});

export const eventCancelRequestSchema = z.object({
  reason: z.string().max(2000).optional(),
});

export const eventSanctionRequestSchema = z.object({
  sanctioningNotes: z.string().max(2000).optional(),
});

export const eventOrganizerReassignRequestSchema = z.object({
  newOrganizerUserId: z.string().min(1),
});

export const fighterOnBehalfRequestSchema = z.object({
  userId: z.string().min(1),
});

export const staffRegistrationRequestSchema = z.object({
  operationalRoleKey: z.string().min(1),
});

export const registrationWithdrawRequestSchema = z.object({
  reason: z.string().max(2000).optional(),
});

export const scheduleEntryCreateRequestSchema = z.object({
  label: z.string().min(1).max(500),
  scheduledStartAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
  scheduledEndAt: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
  durationMinutes: z.number().int().min(1).optional(),
  eventRegistrationId: z.string().uuid().optional(),
  placeholderLabel: z.string().max(500).optional(),
  sortOrder: z.number().int().optional(),
  acknowledgeScheduleWarnings: z.boolean().optional().default(false),
});

export const scheduleEntryUpdateRequestSchema = z.object({
  label: z.string().min(1).max(500).optional(),
  scheduledStartAt: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
  scheduledEndAt: z.string().datetime({ offset: true }).or(z.string().min(1)).nullable().optional(),
  durationMinutes: z.number().int().min(1).nullable().optional(),
  status: scheduleEntryStatusSchema.optional(),
  venueLabelOverride: z.string().max(500).nullable().optional(),
  reason: z.string().max(2000).optional(),
  acknowledgeScheduleWarnings: z.boolean().optional(),
});

export type EventResponse = {
  id: string;
  name: string;
  description?: string | null;
  timezone: string;
  startsAt: string;
  endsAt?: string | null;
  venueLabel: string;
  lifecycleStatus: z.infer<typeof eventLifecycleStatusSchema>;
  isSanctioned: boolean;
  sanctioningNotes?: string | null;
  organizerUserId: string;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  fighterCapacity?: number | null;
  staffCapacity?: Record<string, number> | null;
  fighterConfirmationRequiredDaysBefore?: number | null;
  publishedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
};

export type EventListItem = Pick<
  EventResponse,
  "id" | "name" | "startsAt" | "venueLabel" | "timezone" | "lifecycleStatus" | "isSanctioned"
>;

export type EventRegistrationResponse = {
  id: string;
  eventId: string;
  userId: string;
  registrationKind: z.infer<typeof registrationKindSchema>;
  staffOperationalRoleKey?: string | null;
  status: z.infer<typeof registrationStatusSchema>;
  teamId?: string | null;
  teamNameSnapshot?: string | null;
  confirmedAt?: string | null;
  waitlistedAt?: string | null;
};

export type MyEventRegistrationsResponse = {
  fighter?: EventRegistrationResponse;
  staff: EventRegistrationResponse[];
};

export type EventRegistrationSummaryResponse = {
  counts: Record<string, number>;
  registrations: EventRegistrationResponse[];
};

export type ScheduleEntryResponse = {
  id: string;
  eventId: string;
  label: string;
  scheduledStartAt: string;
  scheduledEndAt?: string | null;
  status: z.infer<typeof scheduleEntryStatusSchema>;
  venueLabelOverride?: string | null;
  eventRegistrationId?: string | null;
  placeholderLabel?: string | null;
  sortOrder: number;
};

export type ScheduleEntryUpdateResult = {
  entry: ScheduleEntryResponse;
  warnings: string[];
};

export type EventScheduleResponse = {
  timezone: string;
  schedulePublished: boolean;
  entries: ScheduleEntryResponse[];
};

export type ScheduleChangeRecordResponse = {
  id: string;
  scheduleEntryId: string;
  fieldName: string;
  priorValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  actorUserId: string;
  createdAt: string;
};

export type PublicEventListItem = Pick<
  EventResponse,
  "id" | "name" | "startsAt" | "venueLabel" | "timezone"
>;
