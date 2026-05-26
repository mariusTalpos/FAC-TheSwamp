import { NextResponse } from "next/server";
import { membershipErrorResponse } from "@/lib/teams/http-errors";
import { endMembership } from "@/lib/teams/membership-service";
import { requireCaptainOfTeam } from "@/lib/teams/permissions";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ teamId: string; membershipId: string }> },
) {
  const { teamId, membershipId } = await ctx.params;
  const gate = await requireCaptainOfTeam(teamId);
  if (!gate.ok) return gate.response;

  const result = await endMembership({
    teamId,
    membershipId,
    actorUserId: gate.session.user.id,
  });

  if ("error" in result) {
    const err = membershipErrorResponse(result.error);
    return NextResponse.json(err.body, { status: err.status });
  }
  return NextResponse.json(result.membership);
}
