import { NextResponse } from "next/server";
import { listScheduleChanges } from "@/lib/events/schedule-service";
import { requireEventManager, requireFacAdminEvent } from "@/lib/events/route-helpers";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { eventId } = await params;
  const managerGate = await requireEventManager(eventId);
  if (managerGate.ok) {
    const changes = await listScheduleChanges(eventId);
    return NextResponse.json(changes);
  }

  const adminGate = await requireFacAdminEvent();
  if (!adminGate.ok) return managerGate.response;

  const changes = await listScheduleChanges(eventId);
  return NextResponse.json(changes);
}
