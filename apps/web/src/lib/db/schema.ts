import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** Auth.js + domain: single sign-in identity table (`user` in PostgreSQL). */
export const userStatusEnum = pgEnum("user_status", ["active", "disabled"]);
export const fighterCompletionStateEnum = pgEnum("fighter_completion_state", [
  "incomplete",
  "complete",
]);

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { withTimezone: true, mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
  status: userStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

export const fighterProfiles = pgTable("fighter_profile", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  completionState: fighterCompletionStateEnum("completion_state").notNull().default("incomplete"),
  displayName: text("display_name").notNull().default(""),
  ringName: text("ring_name"),
  visibility: jsonb("visibility")
    .$type<Record<string, { public: boolean }>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const operationalRoles = pgTable("operational_role", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  displayName: text("display_name").notNull(),
  isPrivileged: boolean("is_privileged").notNull().default(false),
});

export const roleAssignments = pgTable(
  "role_assignment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    operationalRoleId: uuid("operational_role_id")
      .notNull()
      .references(() => operationalRoles.id),
    assignedByUserId: text("assigned_by_user_id")
      .notNull()
      .references(() => users.id),
    validFrom: timestamp("valid_from", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    validTo: timestamp("valid_to", { withTimezone: true, mode: "date" }),
  },
  (t) => ({
    activeUserRoleUnique: uniqueIndex("role_assignment_user_role_active")
      .on(t.userId, t.operationalRoleId)
      .where(sql`${t.validTo} IS NULL`),
  }),
);

export const auditEvents = pgTable("audit_event", {
  id: bigint("id", { mode: "bigint" })
    .primaryKey()
    .generatedAlwaysAsIdentity(),
  eventType: text("event_type").notNull(),
  actorUserId: text("actor_user_id").references(() => users.id),
  targetUserId: text("target_user_id").references(() => users.id),
  payload: jsonb("payload")
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

/** Epic E2 — teams & rosters */
export const teamStatusEnum = pgEnum("team_status", ["active", "deactivated"]);
export const teamMemberKindEnum = pgEnum("team_member_kind", ["fighter", "squire"]);
export const teamMembershipStatusEnum = pgEnum("team_membership_status", [
  "pending",
  "active",
  "rejected",
  "ended",
]);

export const teams = pgTable("team", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  region: text("region"),
  tierOrDivision: text("tier_or_division"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  status: teamStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const teamCaptainAssignments = pgTable(
  "team_captain_assignment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedByUserId: text("assigned_by_user_id")
      .notNull()
      .references(() => users.id),
    validFrom: timestamp("valid_from", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    validTo: timestamp("valid_to", { withTimezone: true, mode: "date" }),
  },
  (t) => ({
    activeCaptainUnique: uniqueIndex("team_captain_assignment_team_user_active")
      .on(t.teamId, t.userId)
      .where(sql`${t.validTo} IS NULL`),
  }),
);

export const teamMemberships = pgTable(
  "team_membership",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    memberKind: teamMemberKindEnum("member_kind").notNull(),
    status: teamMembershipStatusEnum("status").notNull().default("pending"),
    requestedAt: timestamp("requested_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
    decidedAt: timestamp("decided_at", { withTimezone: true, mode: "date" }),
    decidedByUserId: text("decided_by_user_id").references(() => users.id),
    decisionNote: text("decision_note"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    activeMemberKindUnique: uniqueIndex("team_membership_user_kind_active")
      .on(t.userId, t.memberKind)
      .where(sql`${t.status} = 'active'`),
    pendingPerTeamUnique: uniqueIndex("team_membership_user_team_kind_pending")
      .on(t.userId, t.teamId, t.memberKind)
      .where(sql`${t.status} = 'pending'`),
  }),
);
