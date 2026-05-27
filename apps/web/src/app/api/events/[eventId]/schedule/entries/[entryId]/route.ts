import { NextResponse } from "next/server";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";
import { scheduleEntryUpdateRequestSchema } from "@/lib/events/contracts";
import { updateEntry } from "@/lib/events/schedule-service";
import { scheduleErrorResponse } from "@/lib/events/http-errors";
import { requireEventManager } from "@/lib/events/route-helpers";

type Params = { params: Promise<{ eventId: string; entryId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { eventId, entryId } = await params;
  const gate = await requireEventManager(eventId);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = scheduleEntryUpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  const result = await updateEntry(eventId, entryId, parsed.data, gate.session.user.id);
  if (result.error) {
    const { status, body: pb } = scheduleErrorResponse(result.error);
    return NextResponse.json(pb, { status });
  }
  return NextResponse.json(result.result);
}
