import { problemJson } from "@/lib/api/problem-json";
import type { EventServiceError } from "@/lib/events/event-service";
import type { RegistrationServiceError } from "@/lib/events/registration-service";
import type { ScheduleServiceError } from "@/lib/events/schedule-service";

export function eventErrorResponse(error: EventServiceError) {
  switch (error) {
    case "not_found":
      return { status: 404, body: problemJson("not_found", "Event not found") };
    case "forbidden":
      return { status: 403, body: problemJson("forbidden", "Action not permitted") };
    case "invalid_transition":
      return {
        status: 400,
        body: problemJson("invalid_transition", "Event lifecycle transition is not allowed"),
      };
    case "target_not_organizer":
      return {
        status: 409,
        body: problemJson("conflict", "Target user does not hold the global organizer role."),
      };
    default:
      return { status: 400, body: problemJson("validation_error", "Invalid request") };
  }
}

export function registrationErrorResponse(error: RegistrationServiceError) {
  switch (error) {
    case "event_not_found":
      return { status: 404, body: problemJson("not_found", "Event not found") };
    case "registration_not_found":
      return { status: 404, body: problemJson("not_found", "Registration not found") };
    case "user_disabled":
      return { status: 403, body: problemJson("forbidden", "Account is disabled.") };
    case "fighter_profile_required":
      return {
        status: 403,
        body: problemJson("forbidden", "A fighter profile is required to register as a fighter."),
      };
    case "staff_role_required":
      return {
        status: 403,
        body: problemJson("forbidden", "You do not hold the required operational role for staff registration."),
      };
    case "registration_closed":
      return {
        status: 409,
        body: problemJson("registration_closed", "Registration is closed for this event."),
      };
    case "duplicate_registration":
      return {
        status: 409,
        body: problemJson("conflict", "You already have an active registration for this event."),
      };
    case "confirmation_not_applicable":
      return {
        status: 409,
        body: problemJson("conflict", "Attendance confirmation is not applicable for this registration."),
      };
    case "forbidden":
    default:
      return { status: 403, body: problemJson("forbidden", "Action not permitted") };
  }
}

export function scheduleErrorResponse(error: ScheduleServiceError) {
  switch (error) {
    case "not_found":
      return { status: 404, body: problemJson("not_found", "Schedule entry not found") };
    case "event_not_found":
      return { status: 404, body: problemJson("not_found", "Event not found") };
    case "overlap_unacknowledged":
      return {
        status: 409,
        body: problemJson(
          "schedule_overlap",
          "Schedule entries overlap. Set acknowledgeScheduleWarnings to proceed.",
        ),
      };
    case "forbidden":
    default:
      return { status: 403, body: problemJson("forbidden", "Action not permitted") };
  }
}
