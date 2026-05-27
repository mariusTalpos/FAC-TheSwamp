import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { teamMemberships, teams } from "@/lib/db/schema";
import type { AffiliationSlot, TeamMemberKind, UserAffiliationSummary } from "@/lib/teams/contracts";

async function slotForKind(userId: string, memberKind: TeamMemberKind): Promise<AffiliationSlot> {
  const baseWhere = and(
    eq(teamMemberships.userId, userId),
    eq(teamMemberships.memberKind, memberKind),
  );

  const [active] = await db
    .select({
      id: teamMemberships.id,
      teamId: teamMemberships.teamId,
      teamName: teams.name,
    })
    .from(teamMemberships)
    .innerJoin(teams, eq(teamMemberships.teamId, teams.id))
    .where(and(baseWhere, eq(teamMemberships.status, "active")))
    .limit(1);

  if (active) {
    return {
      status: "active",
      teamId: active.teamId,
      teamName: active.teamName,
      membershipId: active.id,
    };
  }

  const [pending] = await db
    .select({
      id: teamMemberships.id,
      teamId: teamMemberships.teamId,
      teamName: teams.name,
    })
    .from(teamMemberships)
    .innerJoin(teams, eq(teamMemberships.teamId, teams.id))
    .where(and(baseWhere, eq(teamMemberships.status, "pending")))
    .limit(1);

  if (pending) {
    return {
      status: "pending",
      teamId: pending.teamId,
      teamName: pending.teamName,
      membershipId: pending.id,
    };
  }

  return { status: "unaffiliated" };
}

export async function getUserAffiliationSummary(userId: string): Promise<UserAffiliationSummary> {
  return {
    fighter: await slotForKind(userId, "fighter"),
    squire: await slotForKind(userId, "squire"),
  };
}
