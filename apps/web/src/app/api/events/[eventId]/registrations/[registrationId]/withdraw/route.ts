import { NextResponse } from "next/server";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";
import { registrationWithdrawRequestSchema } from "@/lib/events/contracts";
import { withdrawRegistrationByOrganizer } from "@/lib/events/registration-service";
import { registrationErrorResponse } from "@/lib/events/http-errors";
import { requireRegistrationSummary } from "@/lib/events/route-helpers";

type Params = { params: Promise<{ eventId: string; registrationId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { eventId, registrationId } = await params;
  const gate = await requireRegistrationSummary(eventId);
  if (!gate.ok) return gate.response;

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = registrationWithdrawRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  const result = await withdrawRegistrationByOrganizer(
    eventId,
    registrationId,
    gate.session.user.id,
    parsed.data.reason,
  );
  if (result.error) {
    const { status, body: pb } = registrationErrorResponse(result.error);
    return NextResponse.json(pb, { status });
  }
  return NextResponse.json(result.registration);
}
