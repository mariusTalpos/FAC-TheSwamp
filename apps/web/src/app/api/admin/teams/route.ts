import { NextResponse } from "next/server";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";
import { requireFacAdmin } from "@/lib/rbac/require-fac-admin";
import { teamCreateRequestSchema } from "@/lib/teams/contracts";
import { createTeam, listTeamsAdmin } from "@/lib/teams/team-service";

export async function GET() {
  const gate = await requireFacAdmin();
  if (!gate.ok) return gate.response;
  const items = await listTeamsAdmin();
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const gate = await requireFacAdmin();
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = teamCreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  const team = await createTeam(parsed.data, gate.session.user.id);
  return NextResponse.json(team, { status: 201 });
}
