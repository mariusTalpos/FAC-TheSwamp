import { NextResponse } from "next/server";
import { EVENT_AUDIT_EVENT_TYPES, writeEventAuditEvent } from "@/lib/events/audit";
import { registerFighter } from "@/lib/events/registration-service";
import { registrationErrorResponse } from "@/lib/events/http-errors";
import { requireAuthSession } from "@/lib/events/route-helpers";

type Params = { params: Promise<{ eventId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const gate = await requireAuthSession();
  if (!gate.ok) return gate.response;

  const { eventId } = await params;
  const result = await registerFighter(eventId, gate.session.user.id);
  if (result.error) {
    if (result.error === "forbidden" || result.error === "fighter_profile_required") {
      await writeEventAuditEvent({
        eventType: EVENT_AUDIT_EVENT_TYPES.registrationActionDenied,
        actorUserId: gate.session.user.id,
        payload: { event_id: eventId, action: result.error },
      });
    }
    const { status, body } = registrationErrorResponse(result.error);
    return NextResponse.json(body, { status });
  }
  return NextResponse.json(result.registration, { status: 201 });
}
