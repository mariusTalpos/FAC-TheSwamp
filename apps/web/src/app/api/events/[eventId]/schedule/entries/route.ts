import { NextResponse } from "next/server";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";
import { scheduleEntryCreateRequestSchema } from "@/lib/events/contracts";
import { createEntry } from "@/lib/events/schedule-service";
import { scheduleErrorResponse } from "@/lib/events/http-errors";
import { requireEventManager } from "@/lib/events/route-helpers";

type Params = { params: Promise<{ eventId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { eventId } = await params;
  const gate = await requireEventManager(eventId);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = scheduleEntryCreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  const result = await createEntry(eventId, parsed.data, gate.session.user.id);
  if (result.error) {
    const { status, body: pb } = scheduleErrorResponse(result.error);
    return NextResponse.json(pb, { status });
  }
  return NextResponse.json(result.result, { status: 201 });
}
