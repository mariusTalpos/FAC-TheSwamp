import { NextResponse } from "next/server";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";
import { eventUpdateRequestSchema } from "@/lib/events/contracts";
import { getEventById, updateEvent } from "@/lib/events/event-service";
import { eventErrorResponse } from "@/lib/events/http-errors";
import { requireAuthSession, requireEventManager } from "@/lib/events/route-helpers";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const gate = await requireAuthSession();
  if (!gate.ok) return gate.response;

  const { eventId } = await params;
  const event = await getEventById(eventId);
  if (!event) {
    return NextResponse.json(problemJson("not_found", "Event not found"), { status: 404 });
  }
  return NextResponse.json(event);
}

export async function PATCH(req: Request, { params }: Params) {
  const { eventId } = await params;
  const gate = await requireEventManager(eventId, true);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = eventUpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  const result = await updateEvent(eventId, parsed.data, gate.session.user.id);
  if (result.error) {
    const { status, body: pb } = eventErrorResponse(result.error);
    return NextResponse.json(pb, { status });
  }
  return NextResponse.json(result.event);
}
