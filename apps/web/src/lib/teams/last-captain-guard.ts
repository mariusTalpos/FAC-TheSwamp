import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { teamCaptainAssignments } from "@/lib/db/schema";

export async function countActiveCaptainsForTeam(teamId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(teamCaptainAssignments)
    .where(and(eq(teamCaptainAssignments.teamId, teamId), isNull(teamCaptainAssignments.validTo)));
  return row?.n ?? 0;
}

export async function userIsActiveCaptainOfTeam(teamId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: teamCaptainAssignments.id })
    .from(teamCaptainAssignments)
    .where(
      and(
        eq(teamCaptainAssignments.teamId, teamId),
        eq(teamCaptainAssignments.userId, userId),
        isNull(teamCaptainAssignments.validTo),
      ),
    )
    .limit(1);
  return Boolean(row);
}
