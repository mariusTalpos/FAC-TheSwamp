import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { auth } from "@/lib/auth/auth.config";
import { adminProvisionUserRequestSchema } from "@/lib/auth/contracts";
import { insertAuditEvent } from "@/lib/audit/write-audit-event";
import { emailExists, provisionUser } from "@/lib/admin/provision-user";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireFacAdmin } from "@/lib/rbac/require-fac-admin";
import { problemJson, zodToProblemJson } from "@/lib/api/problem-json";

export async function GET() {
  const gate = await requireFacAdmin();
  if (!gate.ok) return gate.response;

  const items = await db
    .select({ id: users.id, email: users.email, status: users.status })
    .from(users)
    .orderBy(asc(users.email));

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const gate = await requireFacAdmin();
  if (!gate.ok) {
    if (gate.response.status === 403) {
      const session = await auth();
      if (session?.user?.id) {
        await insertAuditEvent({
          eventType: "role.elevation_denied",
          actorUserId: session.user.id,
          targetUserId: session.user.id,
          payload: { action: "admin_create_user" },
        });
      }
    }
    return gate.response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(problemJson("invalid_json", "Invalid JSON body"), { status: 400 });
  }

  const parsed = adminProvisionUserRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodToProblemJson(parsed.error), { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  if (await emailExists(email)) {
    return NextResponse.json(problemJson("conflict", "Email already in use"), { status: 409 });
  }

  const result = await provisionUser(parsed.data);

  await insertAuditEvent({
    eventType: "user.created",
    actorUserId: gate.session.user.id,
    targetUserId: result.userId,
    payload: { provisionMode: result.provisionMode, source: "admin_provision" },
  });

  return NextResponse.json(
    { userId: result.userId, provisionMode: result.provisionMode },
    { status: 201 },
  );
}
