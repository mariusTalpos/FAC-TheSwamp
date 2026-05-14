import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth/auth.config";
import { roleMutationBodySchema } from "@/lib/auth/contracts";
import { db } from "@/lib/db";
import { operationalRoles, roleAssignments, users } from "@/lib/db/schema";
import { insertAuditEvent } from "@/lib/audit/write-audit-event";
import {
  countActiveFacAdmins,
  userHasActiveFacAdmin,
} from "@/lib/rbac/last-fac-admin-guard";
import { requireFacAdmin, FAC_ADMIN_ROLE_KEY } from "@/lib/rbac/require-fac-admin";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";

async function elevationDenialIfNeeded(
  response: NextResponse,
  targetUserId: string,
  action: string,
) {
  if (response.status !== 403) return;
  const session = await auth();
  if (!session?.user?.id) return;
  await insertAuditEvent({
    eventType: "role.elevation_denied",
    actorUserId: session.user.id,
    targetUserId,
    payload: { action },
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  const { userId } = await ctx.params;
  const gate = await requireFacAdmin();
  if (!gate.ok) {
    await elevationDenialIfNeeded(gate.response, userId, "admin_assign_role");
    return gate.response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = roleMutationBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) {
    return NextResponse.json(problemJson("not_found", "User not found"), { status: 404 });
  }

  const [role] = await db
    .select()
    .from(operationalRoles)
    .where(eq(operationalRoles.key, parsed.data.operationalRoleKey))
    .limit(1);
  if (!role) {
    return NextResponse.json(problemJson("validation_error", "Unknown operational role"), {
      status: 400,
    });
  }

  const [existing] = await db
    .select()
    .from(roleAssignments)
    .where(
      and(
        eq(roleAssignments.userId, userId),
        eq(roleAssignments.operationalRoleId, role.id),
        isNull(roleAssignments.validTo),
      ),
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ ok: true });
  }

  await db.insert(roleAssignments).values({
    userId,
    operationalRoleId: role.id,
    assignedByUserId: gate.session.user.id,
  });

  await insertAuditEvent({
    eventType: "role.assigned",
    actorUserId: gate.session.user.id,
    targetUserId: userId,
    payload: { operationalRoleKey: role.key },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  const { userId } = await ctx.params;
  const gate = await requireFacAdmin();
  if (!gate.ok) {
    await elevationDenialIfNeeded(gate.response, userId, "admin_revoke_role");
    return gate.response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = roleMutationBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  const [role] = await db
    .select()
    .from(operationalRoles)
    .where(eq(operationalRoles.key, parsed.data.operationalRoleKey))
    .limit(1);
  if (!role) {
    return NextResponse.json(problemJson("validation_error", "Unknown operational role"), {
      status: 400,
    });
  }

  const [active] = await db
    .select()
    .from(roleAssignments)
    .where(
      and(
        eq(roleAssignments.userId, userId),
        eq(roleAssignments.operationalRoleId, role.id),
        isNull(roleAssignments.validTo),
      ),
    )
    .limit(1);

  if (!active) {
    return new NextResponse(null, { status: 204 });
  }

  if (role.key === FAC_ADMIN_ROLE_KEY) {
    const isAdmin = await userHasActiveFacAdmin(userId);
    const total = await countActiveFacAdmins();
    if (isAdmin && total <= 1) {
      return NextResponse.json(
        problemJson("last_fac_admin", "Cannot remove the last FAC administrator."),
        { status: 409 },
      );
    }
  }

  await db
    .update(roleAssignments)
    .set({ validTo: new Date() })
    .where(eq(roleAssignments.id, active.id));

  await insertAuditEvent({
    eventType: "role.revoked",
    actorUserId: gate.session.user.id,
    targetUserId: userId,
    payload: { operationalRoleKey: role.key },
  });

  return new NextResponse(null, { status: 204 });
}
