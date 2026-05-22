import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { fighterProfiles, teamMemberships, teams, users } from "@/lib/db/schema";
import type { TeamMembershipResponse, TeamResponse } from "@/lib/teams/contracts";

export function toIso(d: Date | null | undefined): string | undefined {
  return d ? d.toISOString() : undefined;
}

export function mapTeam(row: typeof teams.$inferSelect): TeamResponse {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    region: row.region,
    tierOrDivision: row.tierOrDivision,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function mapMembership(
  row: typeof teamMemberships.$inferSelect,
): Promise<TeamMembershipResponse> {
  const [profile] = await db
    .select({ displayName: fighterProfiles.displayName })
    .from(fighterProfiles)
    .where(eq(fighterProfiles.userId, row.userId))
    .limit(1);

  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);

  return {
    id: row.id,
    teamId: row.teamId,
    userId: row.userId,
    memberKind: row.memberKind,
    status: row.status,
    requestedAt: row.requestedAt.toISOString(),
    startedAt: toIso(row.startedAt) ?? null,
    endedAt: toIso(row.endedAt) ?? null,
    applicantDisplayName: profile?.displayName || user?.name || undefined,
  };
}
