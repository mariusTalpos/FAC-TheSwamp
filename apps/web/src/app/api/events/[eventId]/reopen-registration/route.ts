import { NextResponse } from "next/server";
import { reopenRegistration } from "@/lib/events/event-service";
import { eventErrorResponse } from "@/lib/events/http-errors";
import { requireEventManager } from "@/lib/events/route-helpers";

type Params = { params: Promise<{ eventId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { eventId } = await params;
  const gate = await requireEventManager(eventId);
  if (!gate.ok) return gate.response;

  const result = await reopenRegistration(eventId, gate.session.user.id);
  if (result.error) {
    const { status, body } = eventErrorResponse(result.error);
    return NextResponse.json(body, { status });
  }
  return NextResponse.json(result.event);
}
