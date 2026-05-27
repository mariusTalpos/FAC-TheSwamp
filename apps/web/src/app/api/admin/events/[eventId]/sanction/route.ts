import { NextResponse } from "next/server";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";
import { eventSanctionRequestSchema } from "@/lib/events/contracts";
import { revokeEventSanction, sanctionEvent } from "@/lib/events/event-service";
import { eventErrorResponse } from "@/lib/events/http-errors";
import { requireFacAdminEvent } from "@/lib/events/route-helpers";

type Params = { params: Promise<{ eventId: string }> };

export async function POST(req: Request, { params }: Params) {
  const gate = await requireFacAdminEvent();
  if (!gate.ok) return gate.response;

  const { eventId } = await params;
  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = eventSanctionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  const result = await sanctionEvent(eventId, parsed.data, gate.session.user.id);
  if (result.error) {
    const { status, body: pb } = eventErrorResponse(result.error);
    return NextResponse.json(pb, { status });
  }
  return NextResponse.json(result.event);
}

export async function DELETE(_req: Request, { params }: Params) {
  const gate = await requireFacAdminEvent();
  if (!gate.ok) return gate.response;

  const { eventId } = await params;
  const result = await revokeEventSanction(eventId, gate.session.user.id);
  if (result.error) {
    const { status, body } = eventErrorResponse(result.error);
    return NextResponse.json(body, { status });
  }
  return NextResponse.json(result.event);
}
