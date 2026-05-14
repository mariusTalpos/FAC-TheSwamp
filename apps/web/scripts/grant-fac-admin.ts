/**
 * Grant `fac_admin` to the first user matching an email (bootstrap helper).
 * Usage: `pnpm db:grant-admin -- you@example.com`
 */
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../src/lib/db/index";
import { operationalRoles, roleAssignments, users } from "../src/lib/db/schema";

const emailArg = process.argv[2];
if (!emailArg) {
  console.error("Usage: pnpm exec tsx scripts/grant-fac-admin.ts <email>");
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();

async function main() {
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!u) {
    console.error("User not found for email:", email);
    process.exit(1);
  }

  const [role] = await db
    .select()
    .from(operationalRoles)
    .where(eq(operationalRoles.key, "fac_admin"))
    .limit(1);
  if (!role) {
    console.error("fac_admin operational role missing — run pnpm db:seed first.");
    process.exit(1);
  }

  const [existing] = await db
    .select()
    .from(roleAssignments)
    .where(
      and(
        eq(roleAssignments.userId, u.id),
        eq(roleAssignments.operationalRoleId, role.id),
        isNull(roleAssignments.validTo),
      ),
    )
    .limit(1);

  if (existing) {
    console.log("User already has fac_admin.");
    return;
  }

  await db.insert(roleAssignments).values({
    userId: u.id,
    operationalRoleId: role.id,
    assignedByUserId: u.id,
  });

  console.log("Granted fac_admin to", email);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
