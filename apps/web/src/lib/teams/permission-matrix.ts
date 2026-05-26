/**
 * Pure permission rules (no Next.js / auth imports) for tests and documentation.
 */

export function canDecideMembership(params: {
  isFacAdmin: boolean;
  isCaptainOfTeam: boolean;
  applicantIsCaptain: boolean;
  actorUserId: string;
  applicantUserId: string;
}): { allowed: boolean; reason?: "self_approval" | "not_captain" } {
  if (params.actorUserId === params.applicantUserId) {
    return { allowed: false, reason: "self_approval" };
  }
  if (params.isFacAdmin) return { allowed: true };
  if (!params.isCaptainOfTeam) return { allowed: false, reason: "not_captain" };
  if (params.applicantIsCaptain) return { allowed: false, reason: "self_approval" };
  return { allowed: true };
}

/**
 * Global operational roles (E1) that do not require team membership:
 * - marshal, fac_admin, organizer (FR-008, FR-009)
 * Team captain is team-scoped only (not operational_role).
 */
