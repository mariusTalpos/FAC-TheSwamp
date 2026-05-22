import { NextResponse } from "next/server";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";
import { teamApplyRequestSchema } from "@/lib/teams/contracts";
import { membershipErrorResponse } from "@/lib/teams/http-errors";
import { applyToTeam } from "@/lib/teams/membership-service";
import { requireSession } from "@/lib/teams/permissions";

export async function POST(req: Request) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = teamApplyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  const result = await applyToTeam({
    userId: gate.session.user.id,
    teamId: parsed.data.teamId,
    memberKind: parsed.data.memberKind,
  });

  if ("error" in result) {
    const err = membershipErrorResponse(result.error);
    return NextResponse.json(err.body, { status: err.status });
  }
  return NextResponse.json(result.membership, { status: 201 });
}
