import { NextResponse } from "next/server";
import { membershipErrorResponse } from "@/lib/teams/http-errors";
import { withdrawPendingApplication } from "@/lib/teams/membership-service";
import { requireSession } from "@/lib/teams/permissions";

type Params = { params: Promise<{ membershipId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const { membershipId } = await params;
  const result = await withdrawPendingApplication({
    userId: gate.session.user.id,
    membershipId,
  });

  if ("error" in result) {
    const err = membershipErrorResponse(result.error);
    return NextResponse.json(err.body, { status: err.status });
  }
  return NextResponse.json(result.membership);
}
