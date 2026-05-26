import { NextResponse } from "next/server";
import { getUserAffiliationSummary } from "@/lib/teams/affiliation-summary";
import { requireSession } from "@/lib/teams/permissions";

export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const summary = await getUserAffiliationSummary(gate.session.user.id);
  return NextResponse.json(summary);
}
