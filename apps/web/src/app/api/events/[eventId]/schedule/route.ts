import { NextResponse } from "next/server";
import { problemJson } from "@/lib/api/problem-json";
import { listBoard } from "@/lib/events/schedule-service";
import { requireScheduleRead } from "@/lib/events/route-helpers";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { eventId } = await params;
  const gate = await requireScheduleRead(eventId);
  if (!gate.ok) return gate.response;

  const board = await listBoard(eventId);
  if (!board) {
    return NextResponse.json(problemJson("not_found", "Event not found"), { status: 404 });
  }
  return NextResponse.json(board);
}
