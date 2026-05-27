/**
 * Demo seed: published event for Epic E3 manual testing.
 * Run after E1 seeds: pnpm db:seed && pnpm db:seed-dev && pnpm db:migrate
 *
 * Usage: npx tsx scripts/seed-events-demo.ts
 */
import "../src/lib/env/load-env";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/index";
import { users } from "../src/lib/db/schema";
import { createEvent, publishEvent } from "../src/lib/events/event-service";
import { registerFighter } from "../src/lib/events/registration-service";

async function main() {
  const [organizer] = await db
    .select()
    .from(users)
    .where(eq(users.email, "organizer@fac.test"))
    .limit(1);
  if (!organizer) {
    throw new Error("organizer@fac.test missing — run pnpm db:seed-dev first.");
  }

  const [fighter] = await db
    .select()
    .from(users)
    .where(eq(users.email, "fighter@fac.test"))
    .limit(1);
  if (!fighter) {
    throw new Error("fighter@fac.test missing — run pnpm db:seed-dev first.");
  }

  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 30);

  const draft = await createEvent(
    {
      name: "Spring Buhurt 2026 (demo)",
      timezone: "America/New_York",
      startsAt: startsAt.toISOString(),
      venueLabel: "Demo Field",
      description: "Mixed-format demo event for E3 quickstart",
      fighterCapacity: 50,
    },
    organizer.id,
  );

  const opens = new Date();
  const closes = new Date(startsAt);
  closes.setDate(closes.getDate() - 1);

  const published = await publishEvent(
    draft.id,
    {
      registrationOpensAt: opens.toISOString(),
      registrationClosesAt: closes.toISOString(),
    },
    organizer.id,
  );

  if (!published.event) throw new Error("Publish failed");

  await registerFighter(published.event.id, fighter.id);

  console.log("\nDemo event seeded:");
  console.log(`  Event: ${published.event.name} (${published.event.id})`);
  console.log(`  Organizer: organizer@fac.test`);
  console.log(`  Sample fighter registration: fighter@fac.test`);
  console.log("\nQuickstart: follow specs/003-events-registration/quickstart.md\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
