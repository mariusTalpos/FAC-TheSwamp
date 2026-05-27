import { getUserAffiliationSummary } from "@/lib/teams/affiliation-summary";

export type FighterAffiliationSnapshot = {
  teamId?: string;
  teamMembershipId?: string;
  teamNameSnapshot?: string;
};

/** Informational team affiliation at fighter registration confirm time (no captain gate). */
export async function getFighterAffiliationSnapshot(
  userId: string,
): Promise<FighterAffiliationSnapshot> {
  const summary = await getUserAffiliationSummary(userId);
  const fighter = summary.fighter;
  if (!fighter || fighter.status !== "active" || !fighter.teamId) {
    return {};
  }
  return {
    teamId: fighter.teamId,
    teamMembershipId: fighter.membershipId,
    teamNameSnapshot: fighter.teamName,
  };
}
