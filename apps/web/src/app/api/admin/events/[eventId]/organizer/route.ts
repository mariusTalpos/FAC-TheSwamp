import { NextResponse } from "next/server";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";
import { eventOrganizerReassignRequestSchema } from "@/lib/events/contracts";
import { reassignOrganizer } from "@/lib/events/event-service";
import { eventErrorResponse } from "@/lib/events/http-errors";
import { requireFacAdminEvent } from "@/lib/events/route-helpers";

type Params = { params: Promise<{ eventId: string }> };

export async function POST(req: Request, { params }: Params) {
  const gate = await requireFacAdminEvent();
  if (!gate.ok) return gate.response;

  const { eventId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = eventOrganizerReassignRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  const result = await reassignOrganizer(eventId, parsed.data, gate.session.user.id);
  if (result.error) {
    const { status, body: pb } = eventErrorResponse(result.error);
    return NextResponse.json(pb, { status });
  }
  return NextResponse.json(result.event);
}
