import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import { problemJson } from "@/lib/api/problem-json";
import { EVENT_AUDIT_EVENT_TYPES, writeEventAuditEvent } from "@/lib/events/audit";
import {
  canCreateEvent,
  canManageEvent,
  canReassignOrganizer,
  canSanctionEvent,
  canViewRegistrationSummary,
  canViewScheduleAsParticipant,
  getEventById,
  type EventRow,
} from "@/lib/events/permissions";
import { FAC_ADMIN_ROLE_KEY } from "@/lib/events/permissions";

export async function requireAuthSession() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json(problemJson("unauthorized", "Sign in required"), {
        status: 401,
      }),
    };
  }
  return { ok: true as const, session, roleKeys: session.user.roleKeys ?? [] };
}

export async function requireEventCreator() {
  const gate = await requireAuthSession();
  if (!gate.ok) return gate;
  if (!canCreateEvent(gate.roleKeys)) {
    return {
      ok: false as const,
      response: NextResponse.json(problemJson("forbidden", "Organizer access is required."), {
        status: 403,
      }),
    };
  }
  return gate;
}

export async function requireEventManager(eventId: string, auditOnDeny = false) {
  const gate = await requireAuthSession();
  if (!gate.ok) return gate;

  const event = await getEventById(eventId);
  if (!event) {
    return {
      ok: false as const,
      response: NextResponse.json(problemJson("not_found", "Event not found"), { status: 404 }),
    };
  }

  if (!canManageEvent(event, gate.session.user.id, gate.roleKeys)) {
    if (auditOnDeny) {
      await writeEventAuditEvent({
        eventType: EVENT_AUDIT_EVENT_TYPES.eventActionDenied,
        actorUserId: gate.session.user.id,
        payload: { event_id: eventId, action: "manage_event_denied" },
      });
    }
    return {
      ok: false as const,
      response: NextResponse.json(problemJson("forbidden", "You cannot manage this event."), {
        status: 403,
      }),
    };
  }

  return { ok: true as const, session: gate.session, roleKeys: gate.roleKeys, event };
}

export async function requireFacAdminEvent() {
  const gate = await requireAuthSession();
  if (!gate.ok) return gate;
  if (!canSanctionEvent(gate.roleKeys)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        problemJson("forbidden", "FAC administrator access is required."),
        { status: 403 },
      ),
    };
  }
  return gate;
}

export async function requireRegistrationSummary(eventId: string) {
  const gate = await requireAuthSession();
  if (!gate.ok) return gate;
  const event = await getEventById(eventId);
  if (!event) {
    return {
      ok: false as const,
      response: NextResponse.json(problemJson("not_found", "Event not found"), { status: 404 }),
    };
  }
  if (!canViewRegistrationSummary(event, gate.session.user.id, gate.roleKeys)) {
    return {
      ok: false as const,
      response: NextResponse.json(problemJson("forbidden", "Cannot view registrations."), {
        status: 403,
      }),
    };
  }
  return { ok: true as const, session: gate.session, roleKeys: gate.roleKeys, event };
}

export async function requireScheduleRead(eventId: string) {
  const gate = await requireAuthSession();
  if (!gate.ok) return gate;
  const event = await getEventById(eventId);
  if (!event) {
    return {
      ok: false as const,
      response: NextResponse.json(problemJson("not_found", "Event not found"), { status: 404 }),
    };
  }
  const canManage = canManageEvent(event, gate.session.user.id, gate.roleKeys);
  const canParticipant = await canViewScheduleAsParticipant(eventId, gate.session.user.id);
  if (!canManage && !canParticipant) {
    return {
      ok: false as const,
      response: NextResponse.json(problemJson("forbidden", "Cannot view schedule."), {
        status: 403,
      }),
    };
  }
  return { ok: true as const, session: gate.session, event };
}

export function isFacAdmin(roleKeys: string[]): boolean {
  return roleKeys.includes(FAC_ADMIN_ROLE_KEY);
}

export { canReassignOrganizer };

export type { EventRow };
