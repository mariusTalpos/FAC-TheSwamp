import { NextResponse } from "next/server";
import { problemJson } from "@/lib/api/problem-json";
import { isPublicTeamRosterEnabled } from "@/lib/teams/public-flag";
import { getActiveRoster, getTeamById } from "@/lib/teams/team-service";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ teamId: string }> },
) {
  if (!isPublicTeamRosterEnabled()) {
    return NextResponse.json(problemJson("not_found", "Public access disabled"), { status: 404 });
  }

  const { teamId } = await ctx.params;
  const team = await getTeamById(teamId);
  if (!team || team.status !== "active") {
    return NextResponse.json(problemJson("not_found", "Team not found"), { status: 404 });
  }

  const roster = await getActiveRoster(teamId);
  return NextResponse.json({
    teamId: roster.teamId,
    members: roster.members.map((m) => ({
      displayName: m.applicantDisplayName ?? m.userId,
      memberKind: m.memberKind,
    })),
  });
}
