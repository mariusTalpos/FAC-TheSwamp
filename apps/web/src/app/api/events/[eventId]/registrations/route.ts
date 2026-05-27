import { NextResponse } from "next/server";
import { listRegistrationSummary } from "@/lib/events/registration-service";
import { requireRegistrationSummary } from "@/lib/events/route-helpers";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { eventId } = await params;
  const gate = await requireRegistrationSummary(eventId);
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as "fighter" | "staff" | null;
  const status = url.searchParams.get("status") ?? undefined;

  const summary = await listRegistrationSummary(eventId, {
    kind: kind ?? undefined,
    status,
  });
  return NextResponse.json(summary);
}
