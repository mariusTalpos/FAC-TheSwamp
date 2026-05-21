/**
 * Dev-only: create test accounts with known passwords and role assignments.
 * Run after `pnpm db:seed` (operational roles). Safe to re-run (upserts by email).
 *
 * Usage: pnpm db:seed-dev
 */
import "../src/lib/env/load-env";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../src/lib/db/index";
import { fighterProfiles, operationalRoles, roleAssignments, users } from "../src/lib/db/schema";

const DEV_PASSWORD = process.env.DEV_SEED_PASSWORD ?? "TestPassword123!";

type DevUserSpec = {
  email: string;
  name: string;
  roleKeys: string[];
  fighter?: { displayName: string; complete?: boolean };
};

const DEV_USERS: DevUserSpec[] = [
  {
    email: "admin@fac.test",
    name: "FAC Admin",
    roleKeys: ["fac_admin"],
  },
  {
    email: "marshal@fac.test",
    name: "Test Marshal",
    roleKeys: ["marshal"],
    fighter: { displayName: "Marshal Max", complete: true },
  },
  {
    email: "organizer@fac.test",
    name: "Test Organizer",
    roleKeys: ["organizer"],
  },
  {
    email: "squire@fac.test",
    name: "Test Squire",
    roleKeys: ["squire"],
  },
  {
    email: "fighter@fac.test",
    name: "Test Fighter",
    roleKeys: [],
    fighter: { displayName: "Plain Fighter", complete: true },
  },
];

async function upsertUser(spec: DevUserSpec, passwordHash: string): Promise<string> {
  const email = spec.email.toLowerCase();
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing) {
    await db
      .update(users)
      .set({
        name: spec.name,
        passwordHash,
        status: "active",
        emailVerified: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id));
    return existing.id;
  }

  const id = randomUUID();
  await db.insert(users).values({
    id,
    email,
    name: spec.name,
    passwordHash,
    status: "active",
    emailVerified: new Date(),
  });
  return id;
}

async function upsertFighterProfile(
  userId: string,
  fighter: NonNullable<DevUserSpec["fighter"]>,
): Promise<void> {
  const [existing] = await db
    .select()
    .from(fighterProfiles)
    .where(eq(fighterProfiles.userId, userId))
    .limit(1);

  const completionState = fighter.complete ? "complete" : "incomplete";

  if (existing) {
    await db
      .update(fighterProfiles)
      .set({
        displayName: fighter.displayName,
        completionState,
        updatedAt: new Date(),
      })
      .where(eq(fighterProfiles.id, existing.id));
    return;
  }

  await db.insert(fighterProfiles).values({
    userId,
    displayName: fighter.displayName,
    completionState,
    visibility: {},
  });
}

async function ensureRole(
  userId: string,
  roleKey: string,
  assignedByUserId: string,
): Promise<void> {
  const [role] = await db
    .select()
    .from(operationalRoles)
    .where(eq(operationalRoles.key, roleKey))
    .limit(1);
  if (!role) {
    throw new Error(`Missing operational role "${roleKey}" — run pnpm db:seed first.`);
  }

  const [active] = await db
    .select()
    .from(roleAssignments)
    .where(
      and(
        eq(roleAssignments.userId, userId),
        eq(roleAssignments.operationalRoleId, role.id),
        isNull(roleAssignments.validTo),
      ),
    )
    .limit(1);

  if (active) return;

  await db.insert(roleAssignments).values({
    userId,
    operationalRoleId: role.id,
    assignedByUserId,
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);
  const ids = new Map<string, string>();

  for (const spec of DEV_USERS) {
    ids.set(spec.email, await upsertUser(spec, passwordHash));
  }

  const adminId = ids.get("admin@fac.test")!;

  for (const spec of DEV_USERS) {
    const userId = ids.get(spec.email)!;
    if (spec.fighter) {
      await upsertFighterProfile(userId, spec.fighter);
    }
    for (const roleKey of spec.roleKeys) {
      await ensureRole(userId, roleKey, adminId);
    }
  }

  console.log("\nDev test accounts (password for all unless DEV_SEED_PASSWORD is set):\n");
  console.log(`  Password: ${DEV_PASSWORD}\n`);
  console.log("  Email                 | Roles              | Fighter profile");
  console.log("  ----------------------|--------------------|------------------");
  for (const spec of DEV_USERS) {
    const roles = spec.roleKeys.length ? spec.roleKeys.join(", ") : "(none)";
    const fighter = spec.fighter ? "yes" : "no";
    console.log(`  ${spec.email.padEnd(22)}| ${roles.padEnd(18)} | ${fighter}`);
  }
  console.log("\nSign in at http://localhost:3000/login\n");
  console.log("Permission checks:");
  console.log("  - admin@fac.test    → /admin/users, role APIs, audit");
  console.log("  - marshal@fac.test  → fighter + marshal (no admin)");
  console.log("  - organizer@fac.test→ staff only, no admin");
  console.log("  - fighter@fac.test  → own profile only, admin APIs 403\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
