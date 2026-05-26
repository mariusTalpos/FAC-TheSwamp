import { z } from "zod";

export const teamMemberKindSchema = z.enum(["fighter", "squire"]);
export const teamStatusSchema = z.enum(["active", "deactivated"]);
export const membershipStatusSchema = z.enum(["pending", "active", "rejected", "ended"]);
export const affiliationStatusSchema = z.enum(["unaffiliated", "pending", "active"]);
export const membershipDecisionSchema = z.enum(["approve", "reject"]);

export const teamCreateRequestSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().max(100).optional(),
  region: z.string().max(200).optional(),
  tierOrDivision: z.string().max(200).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(50).optional(),
});

export const teamUpdateRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  region: z.string().max(200).nullable().optional(),
  tierOrDivision: z.string().max(200).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  status: teamStatusSchema.optional(),
});

export const teamCaptainAssignRequestSchema = z.object({
  userId: z.string().min(1),
});

export const teamApplyRequestSchema = z.object({
  teamId: z.string().uuid(),
  memberKind: teamMemberKindSchema,
});

export const membershipDecisionRequestSchema = z.object({
  decision: membershipDecisionSchema,
  note: z.string().max(2000).optional(),
});

export type TeamMemberKind = z.infer<typeof teamMemberKindSchema>;
export type TeamResponse = {
  id: string;
  name: string;
  slug?: string | null;
  region?: string | null;
  tierOrDivision?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status: "active" | "deactivated";
  createdAt: string;
};

export type TeamMembershipResponse = {
  id: string;
  teamId: string;
  userId: string;
  memberKind: TeamMemberKind;
  status: z.infer<typeof membershipStatusSchema>;
  requestedAt?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  applicantDisplayName?: string;
};

export type TeamRosterResponse = {
  teamId: string;
  members: TeamMembershipResponse[];
};

export type AffiliationSlot = {
  status: "unaffiliated" | "pending" | "active";
  teamId?: string;
  teamName?: string;
  membershipId?: string;
};

export type UserAffiliationSummary = {
  fighter?: AffiliationSlot;
  squire?: AffiliationSlot;
};
