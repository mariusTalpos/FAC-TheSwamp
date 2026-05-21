import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { fighterProfiles } from "@/lib/db/schema";
import { toPublicFighterProfile } from "@/lib/profile/public-projection";
import { problemJson } from "@/lib/api/problem-json";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ fighterId: string }> },
) {
  const { fighterId } = await ctx.params;

  const [fp] = await db
    .select()
    .from(fighterProfiles)
    .where(eq(fighterProfiles.id, fighterId))
    .limit(1);

  if (!fp || fp.completionState !== "complete") {
    return NextResponse.json(problemJson("not_found", "Fighter not found"), { status: 404 });
  }

  const publicPayload = toPublicFighterProfile({
    id: fp.id,
    displayName: fp.displayName,
    ringName: fp.ringName,
    visibility: fp.visibility ?? {},
  });

  return NextResponse.json(publicPayload);
}
