import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  teamCaptainAssignments,
  teamMemberships,
  teams,
  users,
} from "@/lib/db/schema";
import { TEAM_AUDIT_EVENT_TYPES, writeTeamAuditEvent } from "@/lib/teams/audit";
import {
  countActiveCaptainsForTeam,
  userIsActiveCaptainOfTeam,
} from "@/lib/teams/last-captain-guard";
import { mapMembership, mapTeam } from "@/lib/teams/projections";
import type { TeamMembershipResponse, TeamResponse, TeamRosterResponse } from "@/lib/teams/contracts";
import type { z } from "zod";
import { teamCreateRequestSchema, teamUpdateRequestSchema } from "@/lib/teams/contracts";

type TeamCreateInput = z.infer<typeof teamCreateRequestSchema>;
type TeamUpdateInput = z.infer<typeof teamUpdateRequestSchema>;

export async function createTeam(
  input: TeamCreateInput,
  actorUserId: string,
): Promise<TeamResponse> {
  const [row] = await db
    .insert(teams)
    .values({
      name: input.name.trim(),
      slug: input.slug?.trim() || null,
      region: input.region?.trim() || null,
      tierOrDivision: input.tierOrDivision?.trim() || null,
      contactEmail: input.contactEmail?.trim() || null,
      contactPhone: input.contactPhone?.trim() || null,
      status: "active",
    })
    .returning();

  await writeTeamAuditEvent({
    eventType: TEAM_AUDIT_EVENT_TYPES.teamCreated,
    actorUserId,
    payload: { team_id: row.id, status_after: row.status },
  });

  return mapTeam(row);
}

export async function listTeamsAdmin(): Promise<TeamResponse[]> {
  const rows = await db.select().from(teams).orderBy(asc(teams.name));
  return rows.map(mapTeam);
}

export async function listActiveTeams(): Promise<TeamResponse[]> {
  const rows = await db
    .select()
    .from(teams)
    .where(eq(teams.status, "active"))
    .orderBy(asc(teams.name));
  return rows.map(mapTeam);
}

export async function getTeamById(teamId: string) {
  const [row] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  return row ?? null;
}

export async function updateTeam(
  teamId: string,
  input: TeamUpdateInput,
  actorUserId: string,
): Promise<TeamResponse | null> {
  const existing = await getTeamById(teamId);
  if (!existing) return null;

  const statusBefore = existing.status;
  const patch: Partial<typeof teams.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.region !== undefined) patch.region = input.region;
  if (input.tierOrDivision !== undefined) patch.tierOrDivision = input.tierOrDivision;
  if (input.contactEmail !== undefined) patch.contactEmail = input.contactEmail;
  if (input.contactPhone !== undefined) patch.contactPhone = input.contactPhone;
  if (input.status !== undefined) patch.status = input.status;

  const [row] = await db.update(teams).set(patch).where(eq(teams.id, teamId)).returning();

  const eventType =
    input.status === "deactivated" && statusBefore !== "deactivated"
      ? TEAM_AUDIT_EVENT_TYPES.teamDeactivated
      : TEAM_AUDIT_EVENT_TYPES.teamUpdated;

  await writeTeamAuditEvent({
    eventType,
    actorUserId,
    payload: {
      team_id: teamId,
      status_before: statusBefore,
      status_after: row.status,
    },
  });

  return mapTeam(row);
}

export type TeamCaptainListItem = {
  userId: string;
  email: string;
  validFrom: string;
};

export async function listActiveTeamCaptains(teamId: string): Promise<TeamCaptainListItem[]> {
  const rows = await db
    .select({
      userId: teamCaptainAssignments.userId,
      email: users.email,
      validFrom: teamCaptainAssignments.validFrom,
    })
    .from(teamCaptainAssignments)
    .innerJoin(users, eq(users.id, teamCaptainAssignments.userId))
    .where(
      and(eq(teamCaptainAssignments.teamId, teamId), isNull(teamCaptainAssignments.validTo)),
    );

  return rows.map((row) => ({
    userId: row.userId,
    email: row.email,
    validFrom: row.validFrom.toISOString(),
  }));
}

export async function assignTeamCaptain(
  teamId: string,
  userId: string,
  assignedByUserId: string,
) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return { error: "not_found" as const };

  if (await userIsActiveCaptainOfTeam(teamId, userId)) {
    return { error: "already_captain" as const };
  }

  const [row] = await db
    .insert(teamCaptainAssignments)
    .values({ teamId, userId, assignedByUserId })
    .returning();

  await writeTeamAuditEvent({
    eventType: TEAM_AUDIT_EVENT_TYPES.captainAssigned,
    actorUserId: assignedByUserId,
    targetUserId: userId,
    payload: { team_id: teamId },
  });

  return {
    teamId: row.teamId,
    userId: row.userId,
    validFrom: row.validFrom.toISOString(),
  };
}

export async function revokeTeamCaptain(
  teamId: string,
  userId: string,
  actorUserId: string,
): Promise<{ ok: true } | { error: "not_found" } | { error: "last_captain" }> {
  const isCaptain = await userIsActiveCaptainOfTeam(teamId, userId);
  if (!isCaptain) return { error: "not_found" };

  const total = await countActiveCaptainsForTeam(teamId);
  if (total <= 1) return { error: "last_captain" };

  await db
    .update(teamCaptainAssignments)
    .set({ validTo: new Date() })
    .where(
      and(
        eq(teamCaptainAssignments.teamId, teamId),
        eq(teamCaptainAssignments.userId, userId),
      ),
    );

  await writeTeamAuditEvent({
    eventType: TEAM_AUDIT_EVENT_TYPES.captainRevoked,
    actorUserId,
    targetUserId: userId,
    payload: { team_id: teamId },
  });

  return { ok: true };
}

export async function getActiveRoster(teamId: string): Promise<TeamRosterResponse> {
  const rows = await db
    .select()
    .from(teamMemberships)
    .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.status, "active")));

  const members: TeamMembershipResponse[] = [];
  for (const row of rows) {
    members.push(await mapMembership(row));
  }
  return { teamId, members };
}

export async function getMembershipHistory(teamId: string): Promise<TeamMembershipResponse[]> {
  const all = await db
    .select()
    .from(teamMemberships)
    .where(
      and(
        eq(teamMemberships.teamId, teamId),
        inArray(teamMemberships.status, ["ended", "rejected"]),
      ),
    );
  const out: TeamMembershipResponse[] = [];
  for (const row of all) {
    out.push(await mapMembership(row));
  }
  return out;
}

export { teamCreateRequestSchema, teamUpdateRequestSchema };
