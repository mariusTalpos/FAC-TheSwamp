import { NextResponse } from "next/server";
import { problemJson } from "@/lib/api/problem-json";
import { listPendingForTeam } from "@/lib/teams/membership-service";
import { requireCaptainOfTeam } from "@/lib/teams/permissions";
import { getTeamById } from "@/lib/teams/team-service";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ teamId: string }> },
) {
  const { teamId } = await ctx.params;
  const gate = await requireCaptainOfTeam(teamId);
  if (!gate.ok) return gate.response;

  const team = await getTeamById(teamId);
  if (!team) {
    return NextResponse.json(problemJson("not_found", "Team not found"), { status: 404 });
  }

  const items = await listPendingForTeam(teamId);
  return NextResponse.json({ teamId, items });
}
