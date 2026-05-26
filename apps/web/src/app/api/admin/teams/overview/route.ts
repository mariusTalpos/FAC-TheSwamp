import { NextResponse } from "next/server";
import { requireFacAdmin } from "@/lib/rbac/require-fac-admin";
import { listTeamsAdminOverview } from "@/lib/teams/team-overview";

export async function GET() {
  const gate = await requireFacAdmin();
  if (!gate.ok) return gate.response;

  const teams = await listTeamsAdminOverview();
  return NextResponse.json({ teams });
}
