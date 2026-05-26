import { NextResponse } from "next/server";
import { requireFacAdmin } from "@/lib/rbac/require-fac-admin";
import { membershipErrorResponse } from "@/lib/teams/http-errors";
import { endMembership } from "@/lib/teams/membership-service";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ teamId: string; membershipId: string }> },
) {
  const gate = await requireFacAdmin();
  if (!gate.ok) return gate.response;

  const { teamId, membershipId } = await ctx.params;
  const result = await endMembership({
    teamId,
    membershipId,
    actorUserId: gate.session.user.id,
    adminOverride: true,
  });

  if ("error" in result) {
    const err = membershipErrorResponse(result.error);
    return NextResponse.json(err.body, { status: err.status });
  }
  return NextResponse.json(result.membership);
}
