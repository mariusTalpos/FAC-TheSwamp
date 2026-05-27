import { NextResponse } from "next/server";
import { confirmFighterAttendance } from "@/lib/events/registration-service";
import { registrationErrorResponse } from "@/lib/events/http-errors";
import { requireAuthSession } from "@/lib/events/route-helpers";

type Params = { params: Promise<{ eventId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const gate = await requireAuthSession();
  if (!gate.ok) return gate.response;

  const { eventId } = await params;
  const result = await confirmFighterAttendance(eventId, gate.session.user.id);
  if (result.error) {
    const { status, body } = registrationErrorResponse(result.error);
    return NextResponse.json(body, { status });
  }
  return NextResponse.json(result.registration);
}
