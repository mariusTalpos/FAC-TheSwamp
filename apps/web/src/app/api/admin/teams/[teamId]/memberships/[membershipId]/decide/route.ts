import { NextResponse } from "next/server";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";
import { requireFacAdmin } from "@/lib/rbac/require-fac-admin";
import { membershipDecisionRequestSchema } from "@/lib/teams/contracts";
import { membershipErrorResponse } from "@/lib/teams/http-errors";
import { decideMembership } from "@/lib/teams/membership-service";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ teamId: string; membershipId: string }> },
) {
  const gate = await requireFacAdmin();
  if (!gate.ok) return gate.response;

  const { teamId, membershipId } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = membershipDecisionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  const result = await decideMembership({
    teamId,
    membershipId,
    actorUserId: gate.session.user.id,
    isFacAdmin: true,
    decision: parsed.data.decision,
    note: parsed.data.note,
    adminOverride: true,
  });

  if ("error" in result) {
    const err = membershipErrorResponse(result.error);
    return NextResponse.json(err.body, { status: err.status });
  }
  return NextResponse.json(result.membership);
}
