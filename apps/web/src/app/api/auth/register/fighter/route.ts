import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { fighterRegistrationRequestSchema } from "@/lib/auth/contracts";
import { db } from "@/lib/db";
import { fighterProfiles, users, auditEvents } from "@/lib/db/schema";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = fighterRegistrationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) {
    return NextResponse.json(problemJson("conflict", "Email already registered"), { status: 409 });
  }

  const id = randomUUID();
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id,
      email,
      name: email.split("@")[0] ?? "Fighter",
      emailVerified: new Date(),
      passwordHash,
      status: "active",
    });
    await tx.insert(fighterProfiles).values({
      userId: id,
      displayName: "",
      completionState: "incomplete",
      visibility: {},
    });
    await tx.insert(auditEvents).values({
      eventType: "user.created",
      actorUserId: id,
      targetUserId: id,
      payload: { source: "fighter_self_registration" },
    });
  });

  const [fp] = await db
    .select({ id: fighterProfiles.id })
    .from(fighterProfiles)
    .where(eq(fighterProfiles.userId, id))
    .limit(1);

  return NextResponse.json(
    { userId: id, fighterProfileId: fp?.id ?? null },
    { status: 201 },
  );
}
