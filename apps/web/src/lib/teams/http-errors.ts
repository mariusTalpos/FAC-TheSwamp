import { problemJson } from "@/lib/api/problem-json";
import type { MembershipServiceError } from "@/lib/teams/membership-service";

export type CaptainAssignError = "not_found" | "already_captain";

export function captainAssignErrorResponse(error: CaptainAssignError) {
  switch (error) {
    case "not_found":
      return { status: 404, body: problemJson("not_found", "User not found") };
    case "already_captain":
      return {
        status: 409,
        body: problemJson(
          "conflict",
          "This user is already an active captain for this team.",
        ),
      };
  }
}

export function membershipErrorResponse(error: MembershipServiceError) {
  switch (error) {
    case "team_not_found":
      return { status: 404, body: problemJson("not_found", "Team not found") };
    case "team_deactivated":
      return {
        status: 400,
        body: problemJson("team_deactivated", "This team is not accepting applications."),
      };
    case "user_disabled":
      return { status: 403, body: problemJson("forbidden", "Account is disabled.") };
    case "dual_affiliation":
      return {
        status: 400,
        body: problemJson(
          "dual_affiliation",
          "You already have an active membership for this role on another team.",
        ),
      };
    case "duplicate_pending":
      return {
        status: 409,
        body: problemJson("conflict", "You already have a pending application for this team."),
      };
    case "squire_role_required":
      return {
        status: 403,
        body: problemJson("forbidden", "Squire operational role is required to apply as squire."),
      };
    case "self_approval":
      return {
        status: 409,
        body: problemJson(
          "self_approval",
          "Captain cannot approve their own application; FAC admin must decide.",
        ),
      };
    case "not_found":
      return { status: 404, body: problemJson("not_found", "Membership not found") };
    case "not_pending":
      return { status: 400, body: problemJson("validation_error", "Membership is not pending") };
    case "not_active":
      return { status: 400, body: problemJson("validation_error", "Membership is not active") };
    case "forbidden":
    default:
      return { status: 403, body: problemJson("forbidden", "Action not permitted") };
  }
}
