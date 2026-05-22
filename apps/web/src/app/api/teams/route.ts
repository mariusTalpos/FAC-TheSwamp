import { NextResponse } from "next/server";
import { requireSession } from "@/lib/teams/permissions";
import { listActiveTeams } from "@/lib/teams/team-service";

export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const items = await listActiveTeams();
  return NextResponse.json(items);
}
