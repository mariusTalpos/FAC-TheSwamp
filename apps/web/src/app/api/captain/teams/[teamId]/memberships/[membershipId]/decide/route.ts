import { NextResponse } from "next/server";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";
import { membershipDecisionRequestSchema } from "@/lib/teams/contracts";
import { membershipErrorResponse } from "@/lib/teams/http-errors";
import { decideMembership } from "@/lib/teams/membership-service";
import { requireCaptainOfTeam } from "@/lib/teams/permissions";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ teamId: string; membershipId: string }> },
) {
  const { teamId, membershipId } = await ctx.params;
  const gate = await requireCaptainOfTeam(teamId);
  if (!gate.ok) return gate.response;

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
    isFacAdmin: false,
    decision: parsed.data.decision,
    note: parsed.data.note,
  });

  if ("error" in result) {
    const err = membershipErrorResponse(result.error);
    return NextResponse.json(err.body, { status: err.status });
  }
  return NextResponse.json(result.membership);
}
