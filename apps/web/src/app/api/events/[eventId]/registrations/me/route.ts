import { NextResponse } from "next/server";
import { getMyRegistrations } from "@/lib/events/registration-service";
import { requireAuthSession } from "@/lib/events/route-helpers";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const gate = await requireAuthSession();
  if (!gate.ok) return gate.response;

  const { eventId } = await params;
  const data = await getMyRegistrations(eventId, gate.session.user.id);
  return NextResponse.json(data);
}
