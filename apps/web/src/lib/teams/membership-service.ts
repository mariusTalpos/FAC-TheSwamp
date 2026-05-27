import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  fighterProfiles,
  teamCaptainAssignments,
  teamMemberships,
  teams,
  users,
} from "@/lib/db/schema";
import { getOperationalRoleKeysForUser } from "@/lib/rbac/operational-role-keys";
import { TEAM_AUDIT_EVENT_TYPES, writeTeamAuditEvent } from "@/lib/teams/audit";
import { userIsActiveCaptainOfTeam } from "@/lib/teams/last-captain-guard";
import { canDecideMembership } from "@/lib/teams/permission-matrix";
import { mapMembership } from "@/lib/teams/projections";
import type { TeamMemberKind, TeamMembershipResponse } from "@/lib/teams/contracts";

export type MembershipServiceError =
  | "team_not_found"
  | "team_deactivated"
  | "user_disabled"
  | "dual_affiliation"
  | "duplicate_pending"
  | "pending_elsewhere"
  | "not_found"
  | "not_pending"
  | "not_active"
  | "self_approval"
  | "forbidden"
  | "squire_role_required"
  | "fighter_profile_required";

export async function applyToTeam(params: {
  userId: string;
  teamId: string;
  memberKind: TeamMemberKind;
}): Promise<
  | { ok: true; membership: TeamMembershipResponse }
  | { error: MembershipServiceError }
> {
  const [team] = await db.select().from(teams).where(eq(teams.id, params.teamId)).limit(1);
  if (!team) return { error: "team_not_found" };
  if (team.status === "deactivated") return { error: "team_deactivated" };

  const [user] = await db.select().from(users).where(eq(users.id, params.userId)).limit(1);
  if (!user || user.status === "disabled") return { error: "user_disabled" };

  if (params.memberKind === "squire") {
    const keys = await getOperationalRoleKeysForUser(params.userId);
    if (!keys.includes("squire")) return { error: "squire_role_required" };
  }

  if (params.memberKind === "fighter") {
    const [fighterProfile] = await db
      .select({ id: fighterProfiles.id })
      .from(fighterProfiles)
      .where(eq(fighterProfiles.userId, params.userId))
      .limit(1);
    if (!fighterProfile) return { error: "fighter_profile_required" };
  }

  const [activeOther] = await db
    .select()
    .from(teamMemberships)
    .where(
      and(
        eq(teamMemberships.userId, params.userId),
        eq(teamMemberships.memberKind, params.memberKind),
        eq(teamMemberships.status, "active"),
      ),
    )
    .limit(1);

  if (activeOther) {
    if (activeOther.teamId !== params.teamId) return { error: "dual_affiliation" };
    return { error: "duplicate_pending" };
  }

  const [pendingOpen] = await db
    .select()
    .from(teamMemberships)
    .where(
      and(
        eq(teamMemberships.userId, params.userId),
        eq(teamMemberships.memberKind, params.memberKind),
        eq(teamMemberships.status, "pending"),
      ),
    )
    .limit(1);

  if (pendingOpen) {
    if (pendingOpen.teamId === params.teamId) return { error: "duplicate_pending" };
    return { error: "pending_elsewhere" };
  }

  const [row] = await db
    .insert(teamMemberships)
    .values({
      teamId: params.teamId,
      userId: params.userId,
      memberKind: params.memberKind,
      status: "pending",
    })
    .returning();

  await writeTeamAuditEvent({
    eventType: TEAM_AUDIT_EVENT_TYPES.membershipApplied,
    actorUserId: params.userId,
    targetUserId: params.userId,
    payload: {
      team_id: params.teamId,
      membership_id: row.id,
      member_kind: params.memberKind,
      status_after: "pending",
    },
  });

  return { ok: true, membership: await mapMembership(row) };
}

/** Applicant withdraws their own pending application so they may apply elsewhere. */
export async function withdrawPendingApplication(params: {
  userId: string;
  membershipId: string;
}): Promise<
  | { ok: true; membership: TeamMembershipResponse }
  | { error: MembershipServiceError }
> {
  const [row] = await db
    .select()
    .from(teamMemberships)
    .where(eq(teamMemberships.id, params.membershipId))
    .limit(1);

  if (!row) return { error: "not_found" };
  if (row.userId !== params.userId) return { error: "forbidden" };
  if (row.status !== "pending") return { error: "not_pending" };

  const now = new Date();
  const [updated] = await db
    .update(teamMemberships)
    .set({
      status: "rejected",
      decidedAt: now,
      decidedByUserId: params.userId,
      decisionNote: "Withdrawn by applicant",
      updatedAt: now,
    })
    .where(eq(teamMemberships.id, row.id))
    .returning();

  await writeTeamAuditEvent({
    eventType: TEAM_AUDIT_EVENT_TYPES.membershipWithdrawn,
    actorUserId: params.userId,
    targetUserId: params.userId,
    payload: {
      team_id: row.teamId,
      membership_id: row.id,
      member_kind: row.memberKind,
      status_before: "pending",
      status_after: "rejected",
    },
  });

  return { ok: true, membership: await mapMembership(updated) };
}

export async function getMembershipById(membershipId: string, teamId: string) {
  const [row] = await db
    .select()
    .from(teamMemberships)
    .where(and(eq(teamMemberships.id, membershipId), eq(teamMemberships.teamId, teamId)))
    .limit(1);
  return row ?? null;
}

export async function listPendingForTeam(teamId: string): Promise<TeamMembershipResponse[]> {
  const rows = await db
    .select()
    .from(teamMemberships)
    .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.status, "pending")));

  const out: TeamMembershipResponse[] = [];
  for (const row of rows) {
    out.push(await mapMembership(row));
  }
  return out;
}

export async function decideMembership(params: {
  teamId: string;
  membershipId: string;
  actorUserId: string;
  isFacAdmin: boolean;
  decision: "approve" | "reject";
  note?: string;
  adminOverride?: boolean;
}): Promise<
  | { ok: true; membership: TeamMembershipResponse }
  | { error: MembershipServiceError }
> {
  const row = await getMembershipById(params.membershipId, params.teamId);
  if (!row) return { error: "not_found" };
  if (row.status !== "pending") return { error: "not_pending" };

  const isCaptain = await userIsActiveCaptainOfTeam(params.teamId, params.actorUserId);
  const applicantIsCaptain = await userIsActiveCaptainOfTeam(params.teamId, row.userId);

  const gate = canDecideMembership({
    isFacAdmin: params.isFacAdmin,
    isCaptainOfTeam: isCaptain,
    applicantIsCaptain,
    actorUserId: params.actorUserId,
    applicantUserId: row.userId,
  });

  if (!gate.allowed) {
    if (gate.reason === "self_approval" && !params.isFacAdmin) {
      return { error: "self_approval" };
    }
    if (!params.isFacAdmin) return { error: "forbidden" };
  }

  if (params.decision === "approve") {
    const [activeOther] = await db
      .select()
      .from(teamMemberships)
      .where(
        and(
          eq(teamMemberships.userId, row.userId),
          eq(teamMemberships.memberKind, row.memberKind),
          eq(teamMemberships.status, "active"),
        ),
      )
      .limit(1);

    if (activeOther) return { error: "dual_affiliation" };

    const now = new Date();
    const [updated] = await db
      .update(teamMemberships)
      .set({
        status: "active",
        startedAt: now,
        decidedAt: now,
        decidedByUserId: params.actorUserId,
        decisionNote: params.note ?? null,
        updatedAt: now,
      })
      .where(eq(teamMemberships.id, row.id))
      .returning();

    await writeTeamAuditEvent({
      eventType: TEAM_AUDIT_EVENT_TYPES.membershipApproved,
      actorUserId: params.actorUserId,
      targetUserId: row.userId,
      payload: {
        team_id: params.teamId,
        membership_id: row.id,
        member_kind: row.memberKind,
        status_before: "pending",
        status_after: "active",
        ...(params.adminOverride ? { admin_override: true } : {}),
      },
    });
    if (params.adminOverride) {
      await writeTeamAuditEvent({
        eventType: TEAM_AUDIT_EVENT_TYPES.membershipAdminOverride,
        actorUserId: params.actorUserId,
        targetUserId: row.userId,
        payload: { team_id: params.teamId, membership_id: row.id, action: "approve" },
      });
    }

    return { ok: true, membership: await mapMembership(updated) };
  }

  const now = new Date();
  const [updated] = await db
    .update(teamMemberships)
    .set({
      status: "rejected",
      decidedAt: now,
      decidedByUserId: params.actorUserId,
      decisionNote: params.note ?? null,
      updatedAt: now,
    })
    .where(eq(teamMemberships.id, row.id))
    .returning();

  await writeTeamAuditEvent({
    eventType: TEAM_AUDIT_EVENT_TYPES.membershipRejected,
    actorUserId: params.actorUserId,
    targetUserId: row.userId,
    payload: {
      team_id: params.teamId,
      membership_id: row.id,
      member_kind: row.memberKind,
      status_before: "pending",
      status_after: "rejected",
    },
  });
  if (params.adminOverride) {
    await writeTeamAuditEvent({
      eventType: TEAM_AUDIT_EVENT_TYPES.membershipAdminOverride,
      actorUserId: params.actorUserId,
      targetUserId: row.userId,
      payload: { team_id: params.teamId, membership_id: row.id, action: "reject" },
    });
  }

  return { ok: true, membership: await mapMembership(updated) };
}

export async function endMembership(params: {
  teamId: string;
  membershipId: string;
  actorUserId: string;
  adminOverride?: boolean;
}): Promise<
  | { ok: true; membership: TeamMembershipResponse }
  | { error: MembershipServiceError }
> {
  const row = await getMembershipById(params.membershipId, params.teamId);
  if (!row) return { error: "not_found" };
  if (row.status !== "active") return { error: "not_active" };

  const now = new Date();
  const [updated] = await db
    .update(teamMemberships)
    .set({ status: "ended", endedAt: now, updatedAt: now })
    .where(eq(teamMemberships.id, row.id))
    .returning();

  await writeTeamAuditEvent({
    eventType: TEAM_AUDIT_EVENT_TYPES.membershipEnded,
    actorUserId: params.actorUserId,
    targetUserId: row.userId,
    payload: {
      team_id: params.teamId,
      membership_id: row.id,
      member_kind: row.memberKind,
      status_before: "active",
      status_after: "ended",
    },
  });

  if (params.adminOverride) {
    await writeTeamAuditEvent({
      eventType: TEAM_AUDIT_EVENT_TYPES.membershipAdminOverride,
      actorUserId: params.actorUserId,
      targetUserId: row.userId,
      payload: { team_id: params.teamId, membership_id: row.id, action: "end" },
    });
  }

  return { ok: true, membership: await mapMembership(updated) };
}

export async function applicantIsCaptainForTeam(teamId: string, userId: string): Promise<boolean> {
  return userIsActiveCaptainOfTeam(teamId, userId);
}

export async function listCaptainTeams(userId: string): Promise<string[]> {
  const rows = await db
    .select({ teamId: teamCaptainAssignments.teamId })
    .from(teamCaptainAssignments)
    .where(
      and(eq(teamCaptainAssignments.userId, userId), isNull(teamCaptainAssignments.validTo)),
    );
  return rows.map((r) => r.teamId);
}
