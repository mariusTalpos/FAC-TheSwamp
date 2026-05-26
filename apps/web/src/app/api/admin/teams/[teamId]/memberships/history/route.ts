import { NextResponse } from "next/server";
import { problemJson } from "@/lib/api/problem-json";
import { requireFacAdmin } from "@/lib/rbac/require-fac-admin";
import { getMembershipHistory, getTeamById } from "@/lib/teams/team-service";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ teamId: string }> },
) {
  const gate = await requireFacAdmin();
  if (!gate.ok) return gate.response;

  const { teamId } = await ctx.params;
  const team = await getTeamById(teamId);
  if (!team) {
    return NextResponse.json(problemJson("not_found", "Team not found"), { status: 404 });
  }

  const memberships = await getMembershipHistory(teamId);
  return NextResponse.json({ teamId, memberships });
}
