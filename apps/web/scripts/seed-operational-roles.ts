import "../src/lib/env/load-env";
import { db } from "../src/lib/db/index";
import { operationalRoles } from "../src/lib/db/schema";
import { OPERATIONAL_ROLE_SEEDS } from "../src/lib/db/seeds/operational-roles";

async function main() {
  for (const row of OPERATIONAL_ROLE_SEEDS) {
    await db
      .insert(operationalRoles)
      .values({
        key: row.key,
        displayName: row.displayName,
        isPrivileged: row.isPrivileged,
      })
      .onConflictDoUpdate({
        target: operationalRoles.key,
        set: {
          displayName: row.displayName,
          isPrivileged: row.isPrivileged,
        },
      });
  }

  const all = await db.select().from(operationalRoles);
  console.log(`Seeded operational_role rows: ${all.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
