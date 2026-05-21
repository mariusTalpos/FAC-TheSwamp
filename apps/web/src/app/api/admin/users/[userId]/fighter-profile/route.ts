import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { fighterProfiles } from "@/lib/db/schema";
import { requireFacAdmin } from "@/lib/rbac/require-fac-admin";
import { problemJson } from "@/lib/api/problem-json";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  const gate = await requireFacAdmin();
  if (!gate.ok) return gate.response;

  const { userId } = await ctx.params;

  const [fp] = await db
    .select()
    .from(fighterProfiles)
    .where(eq(fighterProfiles.userId, userId))
    .limit(1);

  if (!fp) {
    return NextResponse.json(problemJson("not_found", "No fighter profile on this user account"), {
      status: 404,
    });
  }

  return NextResponse.json({
    id: fp.id,
    completionState: fp.completionState,
    displayName: fp.displayName,
    visibility: fp.visibility ?? {},
  });
}
