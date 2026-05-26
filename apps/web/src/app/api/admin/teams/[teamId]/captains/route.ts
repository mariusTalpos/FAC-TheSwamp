import { NextResponse } from "next/server";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";
import { requireFacAdmin } from "@/lib/rbac/require-fac-admin";
import { teamCaptainAssignRequestSchema } from "@/lib/teams/contracts";
import { captainAssignErrorResponse } from "@/lib/teams/http-errors";
import {
  assignTeamCaptain,
  getTeamById,
  listActiveTeamCaptains,
} from "@/lib/teams/team-service";

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

  const captains = await listActiveTeamCaptains(teamId);
  return NextResponse.json({ captains });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ teamId: string }> },
) {
  const gate = await requireFacAdmin();
  if (!gate.ok) return gate.response;

  const { teamId } = await ctx.params;
  const team = await getTeamById(teamId);
  if (!team) {
    return NextResponse.json(problemJson("not_found", "Team not found"), { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = teamCaptainAssignRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  const result = await assignTeamCaptain(teamId, parsed.data.userId, gate.session.user.id);
  if ("error" in result) {
    const { status, body } = captainAssignErrorResponse(result.error);
    return NextResponse.json(body, { status });
  }
  return NextResponse.json(result, { status: 201 });
}
