import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth.config";
import { fighterProfilePatchSchema } from "@/lib/auth/contracts";
import { db } from "@/lib/db";
import { fighterProfiles } from "@/lib/db/schema";
import { insertAuditEvent } from "@/lib/audit/write-audit-event";
import {
  normalizeRingNameVisibility,
  toFighterProfilePrivate,
  validateRingNamePublicVisibility,
} from "@/lib/profile/fighter-profile-private";
import { deriveCompletionState } from "@/lib/profile/minimum-policy";
import { mergeVisibility, visibilityDelta } from "@/lib/profile/visibility";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(problemJson("unauthorized", "Sign in required"), { status: 401 });
  }

  const [fp] = await db
    .select()
    .from(fighterProfiles)
    .where(eq(fighterProfiles.userId, session.user.id))
    .limit(1);

  if (!fp) {
    return NextResponse.json(problemJson("not_found", "No fighter profile on account"), {
      status: 404,
    });
  }

  return NextResponse.json(toFighterProfilePrivate(fp));
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(problemJson("unauthorized", "Sign in required"), { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = fighterProfilePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  const [before] = await db
    .select()
    .from(fighterProfiles)
    .where(eq(fighterProfiles.userId, session.user.id))
    .limit(1);

  if (!before) {
    return NextResponse.json(problemJson("not_found", "No fighter profile on account"), {
      status: 404,
    });
  }

  const nextDisplayName =
    parsed.data.displayName !== undefined ? parsed.data.displayName : before.displayName;

  const nextRingName =
    parsed.data.ringName !== undefined ? parsed.data.ringName : before.ringName;

  let nextVisibility = normalizeRingNameVisibility(
    nextRingName,
    mergeVisibility(before.visibility ?? {}, parsed.data.visibility),
  );

  const visibilityError = validateRingNamePublicVisibility(nextRingName, nextVisibility);
  if (visibilityError) {
    return NextResponse.json(problemJson("validation_error", visibilityError), { status: 400 });
  }

  const completionState = deriveCompletionState({
    displayName: nextDisplayName,
    ringName: nextRingName,
  });

  const visDelta = visibilityDelta(before.visibility ?? {}, nextVisibility);

  await db
    .update(fighterProfiles)
    .set({
      displayName: nextDisplayName,
      ringName: nextRingName,
      visibility: nextVisibility,
      completionState,
      updatedAt: new Date(),
    })
    .where(eq(fighterProfiles.id, before.id));

  if (Object.keys(visDelta).length > 0) {
    await insertAuditEvent({
      eventType: "profile.visibility_changed",
      actorUserId: session.user.id,
      targetUserId: session.user.id,
      payload: { before: visDelta, keys: Object.keys(visDelta) },
    });
  }

  const [fp] = await db
    .select()
    .from(fighterProfiles)
    .where(eq(fighterProfiles.id, before.id))
    .limit(1);

  return NextResponse.json(toFighterProfilePrivate(fp!));
}
