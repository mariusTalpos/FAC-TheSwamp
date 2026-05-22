import { NextResponse } from "next/server";
import { problemJson } from "@/lib/api/problem-json";
import { requireActiveMemberOfTeam } from "@/lib/teams/permissions";
import { getActiveRoster, getTeamById } from "@/lib/teams/team-service";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ teamId: string }> },
) {
  const { teamId } = await ctx.params;
  const gate = await requireActiveMemberOfTeam(teamId);
  if (!gate.ok) return gate.response;

  const team = await getTeamById(teamId);
  if (!team) {
    return NextResponse.json(problemJson("not_found", "Team not found"), { status: 404 });
  }

  const roster = await getActiveRoster(teamId);
  const selfId = gate.session.user.id;
  roster.members = roster.members.filter((m) => m.userId !== selfId);
  return NextResponse.json(roster);
}
