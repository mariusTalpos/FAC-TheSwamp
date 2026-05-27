import { NextResponse } from "next/server";
import { problemJson } from "@/lib/api/problem-json";
import { listPublicPublishedEvents } from "@/lib/events/event-service";
import { isPublicEventsEnabled } from "@/lib/events/public-flag";

export async function GET(req: Request) {
  if (!isPublicEventsEnabled()) {
    return NextResponse.json(problemJson("not_found", "Public events are disabled"), {
      status: 404,
    });
  }

  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 50;
  const items = await listPublicPublishedEvents(limit);
  return NextResponse.json(items);
}
