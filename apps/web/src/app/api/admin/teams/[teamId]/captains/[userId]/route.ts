import { NextResponse } from "next/server";
import { problemJson } from "@/lib/api/problem-json";
import { requireFacAdmin } from "@/lib/rbac/require-fac-admin";
import { revokeTeamCaptain } from "@/lib/teams/team-service";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ teamId: string; userId: string }> },
) {
  const gate = await requireFacAdmin();
  if (!gate.ok) return gate.response;

  const { teamId, userId } = await ctx.params;
  const result = await revokeTeamCaptain(teamId, userId, gate.session.user.id);

  if ("error" in result && result.error === "not_found") {
    return NextResponse.json(problemJson("not_found", "Captain assignment not found"), {
      status: 404,
    });
  }
  if ("error" in result && result.error === "last_captain") {
    return NextResponse.json(
      problemJson("last_captain", "Cannot remove the last active team captain."),
      { status: 409 },
    );
  }
  return new NextResponse(null, { status: 204 });
}
