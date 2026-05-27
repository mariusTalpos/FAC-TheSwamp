import { NextResponse } from "next/server";
import { problemJson } from "@/lib/api/problem-json";
import { getEventRow } from "@/lib/events/event-service";
import { mapPublicEvent } from "@/lib/events/projections";
import { isPublicEventsEnabled } from "@/lib/events/public-flag";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(_req: Request, { params }: Params) {
  if (!isPublicEventsEnabled()) {
    return NextResponse.json(problemJson("not_found", "Public events are disabled"), {
      status: 404,
    });
  }

  const { eventId } = await params;
  const row = await getEventRow(eventId);
  if (!row || row.lifecycleStatus !== "published") {
    return NextResponse.json(problemJson("not_found", "Event not found"), { status: 404 });
  }
  return NextResponse.json(mapPublicEvent(row));
}
