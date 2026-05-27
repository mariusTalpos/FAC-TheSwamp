import { NextResponse } from "next/server";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";
import { eventCreateRequestSchema } from "@/lib/events/contracts";
import {
  createEvent,
  listOrganizerEvents,
  listPublishedUpcomingEvents,
} from "@/lib/events/event-service";
import { requireAuthSession, requireEventCreator, isFacAdmin } from "@/lib/events/route-helpers";
import { ORGANIZER_ROLE_KEY } from "@/lib/events/permissions";

export async function GET(req: Request) {
  const gate = await requireAuthSession();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");
  if (scope === "organizer") {
    const canOrganize =
      isFacAdmin(gate.roleKeys) || gate.roleKeys.includes(ORGANIZER_ROLE_KEY);
    if (!canOrganize) {
      return NextResponse.json(
        { code: "forbidden", message: "Organizer access is required." },
        { status: 403 },
      );
    }
    const items = await listOrganizerEvents(
      gate.session.user.id,
      isFacAdmin(gate.roleKeys),
    );
    return NextResponse.json(items);
  }

  const fromParam = url.searchParams.get("from");
  const limitParam = url.searchParams.get("limit");
  const from = fromParam ? new Date(fromParam) : undefined;
  const limit = limitParam ? Number(limitParam) : undefined;

  const items = await listPublishedUpcomingEvents({ from, limit });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const gate = await requireEventCreator();
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = eventCreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  const event = await createEvent(parsed.data, gate.session.user.id);
  return NextResponse.json(event, { status: 201 });
}
