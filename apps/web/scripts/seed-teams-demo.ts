/**
 * Demo seed: sample team + captain assignment for Epic E2 manual testing.
 * Run after E1 seeds: pnpm db:seed && pnpm db:seed-dev && pnpm db:migrate
 *
 * Usage: npx tsx scripts/seed-teams-demo.ts
 */
import "../src/lib/env/load-env";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/index";
import { users } from "../src/lib/db/schema";
import { assignTeamCaptain, createTeam } from "../src/lib/teams/team-service";

async function main() {
  const [admin] = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@fac.test"))
    .limit(1);
  if (!admin) {
    throw new Error("admin@fac.test missing — run pnpm db:seed-dev first.");
  }

  let [fighter] = await db
    .select()
    .from(users)
    .where(eq(users.email, "fighter@fac.test"))
    .limit(1);

  if (!fighter) {
    throw new Error("fighter@fac.test missing — run pnpm db:seed-dev first.");
  }

  const team = await createTeam(
    { name: "North Hold", region: "Demo Region" },
    admin.id,
  );

  await assignTeamCaptain(team.id, fighter.id, admin.id);

  console.log("\nDemo team seeded:");
  console.log(`  Team: ${team.name} (${team.id})`);
  console.log(`  Captain: fighter@fac.test`);
  console.log("\nQuickstart: sign in as admin → assign captain, or use fighter as captain for pending queue tests.\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
