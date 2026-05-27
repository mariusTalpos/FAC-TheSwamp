import { NextResponse } from "next/server";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";
import { fighterOnBehalfRequestSchema } from "@/lib/events/contracts";
import { EVENT_AUDIT_EVENT_TYPES, writeEventAuditEvent } from "@/lib/events/audit";
import { registerFighterOnBehalf } from "@/lib/events/registration-service";
import { registrationErrorResponse } from "@/lib/events/http-errors";
import { requireEventManager, isFacAdmin } from "@/lib/events/route-helpers";

type Params = { params: Promise<{ eventId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { eventId } = await params;
  const gate = await requireEventManager(eventId, true);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = fighterOnBehalfRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  if (
    !isFacAdmin(gate.roleKeys) &&
    gate.event.organizerUserId !== gate.session.user.id
  ) {
    await writeEventAuditEvent({
      eventType: EVENT_AUDIT_EVENT_TYPES.registrationActionDenied,
      actorUserId: gate.session.user.id,
      payload: { event_id: eventId, action: "on_behalf_denied" },
    });
    return NextResponse.json(
      problemJson("forbidden", "Only the event organizer or FAC admin may register on behalf."),
      { status: 403 },
    );
  }

  const result = await registerFighterOnBehalf(
    eventId,
    parsed.data.userId,
    gate.session.user.id,
  );
  if (result.error) {
    const { status, body: pb } = registrationErrorResponse(result.error);
    return NextResponse.json(pb, { status });
  }
  return NextResponse.json(result.registration, { status: 201 });
}
