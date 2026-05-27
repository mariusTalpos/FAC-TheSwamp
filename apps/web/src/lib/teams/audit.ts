import { insertAuditEvent } from "@/lib/audit/write-audit-event";

export const TEAM_AUDIT_EVENT_TYPES = {
  teamCreated: "team.created",
  teamUpdated: "team.updated",
  teamDeactivated: "team.deactivated",
  captainAssigned: "team_captain.assigned",
  captainRevoked: "team_captain.revoked",
  membershipApplied: "membership.applied",
  membershipWithdrawn: "membership.withdrawn",
  membershipApproved: "membership.approved",
  membershipRejected: "membership.rejected",
  membershipEnded: "membership.ended",
  membershipActionDenied: "membership.action_denied",
  membershipAdminOverride: "membership.admin_override",
} as const;

export type TeamAuditPayload = {
  team_id?: string;
  membership_id?: string;
  member_kind?: string;
  status_before?: string;
  status_after?: string;
  action?: string;
  [key: string]: unknown;
};

export async function writeTeamAuditEvent(input: {
  eventType: string;
  actorUserId?: string | null;
  targetUserId?: string | null;
  payload?: TeamAuditPayload;
}) {
  await insertAuditEvent({
    eventType: input.eventType,
    actorUserId: input.actorUserId,
    targetUserId: input.targetUserId,
    payload: input.payload ?? {},
  });
}
