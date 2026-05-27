import { NextResponse } from "next/server";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";
import { staffRegistrationRequestSchema } from "@/lib/events/contracts";
import { withdrawStaff } from "@/lib/events/registration-service";
import { registrationErrorResponse } from "@/lib/events/http-errors";
import { requireAuthSession } from "@/lib/events/route-helpers";

type Params = { params: Promise<{ eventId: string }> };

export async function POST(req: Request, { params }: Params) {
  const gate = await requireAuthSession();
  if (!gate.ok) return gate.response;

  const { eventId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = staffRegistrationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  const result = await withdrawStaff(
    eventId,
    gate.session.user.id,
    parsed.data.operationalRoleKey,
  );
  if (result.error) {
    const { status, body: pb } = registrationErrorResponse(result.error);
    return NextResponse.json(pb, { status });
  }
  return NextResponse.json(result.registration);
}
