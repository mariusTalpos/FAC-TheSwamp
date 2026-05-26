import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { teamMemberships, teams } from "@/lib/db/schema";
import type { AffiliationSlot, TeamMemberKind, UserAffiliationSummary } from "@/lib/teams/contracts";

async function slotForKind(userId: string, memberKind: TeamMemberKind): Promise<AffiliationSlot> {
  const [latest] = await db
    .select({
      id: teamMemberships.id,
      status: teamMemberships.status,
      teamId: teamMemberships.teamId,
      teamName: teams.name,
    })
    .from(teamMemberships)
    .innerJoin(teams, eq(teamMemberships.teamId, teams.id))
    .where(and(eq(teamMemberships.userId, userId), eq(teamMemberships.memberKind, memberKind)))
    .orderBy(desc(teamMemberships.updatedAt))
    .limit(1);

  if (!latest) return { status: "unaffiliated" };

  if (latest.status === "active") {
    return {
      status: "active",
      teamId: latest.teamId,
      teamName: latest.teamName,
      membershipId: latest.id,
    };
  }
  if (latest.status === "pending") {
    return {
      status: "pending",
      teamId: latest.teamId,
      teamName: latest.teamName,
      membershipId: latest.id,
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
