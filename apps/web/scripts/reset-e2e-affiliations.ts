/**
 * Clears fighter/squire membership slots for dev test accounts so E2E can re-apply.
 * Safe for local/CI test DBs only.
 */
import "../src/lib/env/load-env";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../src/lib/db/index";
import { teamMemberships, users } from "../src/lib/db/schema";

const TEST_EMAILS = ["fighter@fac.test", "captain@fac.test", "marshal@fac.test"];

async function main() {
  const rows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.email, TEST_EMAILS));

  const userIds = rows.map((r) => r.id);
  if (userIds.length === 0) return;

  const now = new Date();
  await db
    .update(teamMemberships)
    .set({ status: "ended", endedAt: now, updatedAt: now })
    .where(
      and(
        inArray(teamMemberships.userId, userIds),
        inArray(teamMemberships.status, ["active", "pending"]),
      ),
    );

  console.log(`Reset active/pending memberships for ${rows.map((r) => r.email).join(", ")}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
