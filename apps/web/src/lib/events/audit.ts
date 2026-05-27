import { insertAuditEvent } from "@/lib/audit/write-audit-event";

export const EVENT_AUDIT_EVENT_TYPES = {
  eventCreated: "event.created",
  eventUpdated: "event.updated",
  eventPublished: "event.published",
  eventRegistrationClosed: "event.registration_closed",
  eventRegistrationReopened: "event.registration_reopened",
  eventStarted: "event.started",
  eventCompleted: "event.completed",
  eventCancelled: "event.cancelled",
  eventSanctioned: "event.sanctioned",
  eventSanctionRevoked: "event.sanction_revoked",
  eventOrganizerReassigned: "event.organizer_reassigned",
  eventActionDenied: "event.action_denied",
  registrationFighterConfirmed: "registration.fighter_confirmed",
  registrationFighterWaitlisted: "registration.fighter_waitlisted",
  registrationFighterWithdrawn: "registration.fighter_withdrawn",
  registrationFighterOnBehalf: "registration.fighter_on_behalf",
  registrationStaffConfirmed: "registration.staff_confirmed",
  registrationStaffWithdrawn: "registration.staff_withdrawn",
  registrationWithdrawnByOrganizer: "registration.withdrawn_by_organizer",
  registrationActionDenied: "registration.action_denied",
  scheduleEntryCreated: "schedule_entry.created",
  scheduleEntryUpdated: "schedule_entry.updated",
  scheduleEntryCancelled: "schedule_entry.cancelled",
} as const;

export type EventAuditPayload = {
  event_id?: string;
  registration_id?: string;
  schedule_entry_id?: string;
  status_before?: string;
  status_after?: string;
  field_name?: string;
  prior_value?: string;
  new_value?: string;
  action?: string;
  [key: string]: unknown;
};

export async function writeEventAuditEvent(input: {
  eventType: string;
  actorUserId?: string | null;
  targetUserId?: string | null;
  payload?: EventAuditPayload;
}) {
  await insertAuditEvent({
    eventType: input.eventType,
    actorUserId: input.actorUserId,
    targetUserId: input.targetUserId,
    payload: input.payload ?? {},
  });
}
