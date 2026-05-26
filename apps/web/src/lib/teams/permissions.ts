import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth/auth.config";
import { problemJson } from "@/lib/api/problem-json";
import { db } from "@/lib/db";
import { teamCaptainAssignments, teamMemberships } from "@/lib/db/schema";
import { FAC_ADMIN_ROLE_KEY } from "@/lib/rbac/require-fac-admin";
import { writeTeamAuditEvent, TEAM_AUDIT_EVENT_TYPES } from "@/lib/teams/audit";
import { userIsActiveCaptainOfTeam } from "@/lib/teams/last-captain-guard";

/**
 * Permission matrix (E2):
 * - FAC admin (`fac_admin`): global team CRUD, all rosters, admin decide/end, history.
 * - Team captain: scoped to assigned team(s) via `team_captain_assignment` (not operational_role).
 * - Marshal / organizer: no team membership required for E1 operational routes (FR-008).
 * - Fighter / squire: apply + read own affiliation; active members read peer roster on own team.
 */

export async function isCaptainOfTeam(teamId: string, userId: string): Promise<boolean> {
  return userIsActiveCaptainOfTeam(teamId, userId);
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json(problemJson("unauthorized", "Sign in required"), {
        status: 401,
      }),
    };
  }
  return { ok: true as const, session };
}

export async function requireFacAdminTeam() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json(problemJson("unauthorized", "Sign in required"), {
        status: 401,
      }),
    };
  }
  if (!(session.user.roleKeys ?? []).includes(FAC_ADMIN_ROLE_KEY)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        problemJson("forbidden", "FAC administrator access is required for this action."),
        { status: 403 },
      ),
    };
  }
  return { ok: true as const, session };
}

export async function requireCaptainOfTeam(teamId: string, auditOnDeny = true) {
  const gate = await requireSession();
  if (!gate.ok) return gate;

  const isCaptain = await isCaptainOfTeam(teamId, gate.session.user.id);
  if (!isCaptain) {
    if (auditOnDeny) {
      await writeTeamAuditEvent({
        eventType: TEAM_AUDIT_EVENT_TYPES.membershipActionDenied,
        actorUserId: gate.session.user.id,
        payload: { team_id: teamId, action: "captain_scope_required" },
      });
    }
    return {
      ok: false as const,
      response: NextResponse.json(
        problemJson("forbidden", "Team captain access is required for this team."),
        { status: 403 },
      ),
    };
  }
  return { ok: true as const, session: gate.session };
}

export async function requireCaptainOrFacAdminForTeamRoster(teamId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json(problemJson("unauthorized", "Sign in required"), {
        status: 401,
      }),
    };
  }
  const isAdmin = (session.user.roleKeys ?? []).includes(FAC_ADMIN_ROLE_KEY);
  if (isAdmin) return { ok: true as const, session, isAdmin: true as const };

  const isCaptain = await isCaptainOfTeam(teamId, session.user.id);
  if (!isCaptain) {
    await writeTeamAuditEvent({
      eventType: TEAM_AUDIT_EVENT_TYPES.membershipActionDenied,
      actorUserId: session.user.id,
      payload: { team_id: teamId, action: "roster_read_denied" },
    });
    return {
      ok: false as const,
      response: NextResponse.json(problemJson("forbidden", "Cannot view this team roster."), {
        status: 403,
      }),
    };
  }
  return { ok: true as const, session, isAdmin: false as const };
}

export async function requireActiveMemberOfTeam(teamId: string) {
  const gate = await requireSession();
  if (!gate.ok) return gate;

  const [row] = await db
    .select({ id: teamMemberships.id })
    .from(teamMemberships)
    .where(
      and(
        eq(teamMemberships.teamId, teamId),
        eq(teamMemberships.userId, gate.session.user.id),
        eq(teamMemberships.status, "active"),
      ),
    )
    .limit(1);

  if (!row) {
    return {
      ok: false as const,
      response: NextResponse.json(
        problemJson("forbidden", "Active team membership is required."),
        { status: 403 },
      ),
    };
  }
  return { ok: true as const, session: gate.session };
}

export { canDecideMembership } from "@/lib/teams/permission-matrix";

/** Cross-team: captain of team A cannot act on team B (enforced by requireCaptainOfTeam). */
export async function denyCrossTeamCaptain(
  actorUserId: string,
  targetTeamId: string,
): Promise<boolean> {
  const [anyCaptain] = await db
    .select({ teamId: teamCaptainAssignments.teamId })
    .from(teamCaptainAssignments)
    .where(
      and(eq(teamCaptainAssignments.userId, actorUserId), isNull(teamCaptainAssignments.validTo)),
    );

  if (!anyCaptain) return false;
  return !(await isCaptainOfTeam(targetTeamId, actorUserId));
}
