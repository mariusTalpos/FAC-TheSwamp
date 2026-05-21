import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth.config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { insertAuditEvent } from "@/lib/audit/write-audit-event";
import { requireFacAdmin } from "@/lib/rbac/require-fac-admin";
import {
  countActiveFacAdmins,
  userHasActiveFacAdmin,
} from "@/lib/rbac/last-fac-admin-guard";
import { problemJson } from "@/lib/api/problem-json";

async function elevationDenialIfNeeded(response: NextResponse, targetUserId: string) {
  if (response.status !== 403) return;
  const session = await auth();
  if (!session?.user?.id) return;
  await insertAuditEvent({
    eventType: "role.elevation_denied",
    actorUserId: session.user.id,
    targetUserId,
    payload: { action: "admin_deactivate_user" },
  });
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  const { userId } = await ctx.params;
  const gate = await requireFacAdmin();
  if (!gate.ok) {
    await elevationDenialIfNeeded(gate.response, userId);
    return gate.response;
  }

  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) {
    return NextResponse.json(problemJson("not_found", "User not found"), { status: 404 });
  }

  const isFac = await userHasActiveFacAdmin(userId);
  if (isFac && (await countActiveFacAdmins()) <= 1) {
    return NextResponse.json(
      problemJson("last_fac_admin", "Cannot deactivate the last FAC administrator."),
      { status: 409 },
    );
  }

  await db
    .update(users)
    .set({ status: "disabled", updatedAt: new Date() })
    .where(eq(users.id, userId));

  await insertAuditEvent({
    eventType: "user.deactivated",
    actorUserId: gate.session.user.id,
    targetUserId: userId,
    payload: {},
  });

  return new NextResponse(null, { status: 204 });
}
