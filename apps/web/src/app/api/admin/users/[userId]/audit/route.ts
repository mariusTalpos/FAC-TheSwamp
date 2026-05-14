import { NextResponse } from "next/server";
import { listAuditEventsForUser } from "@/lib/audit/list-audit-events-for-user";
import { requireFacAdmin } from "@/lib/rbac/require-fac-admin";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  const gate = await requireFacAdmin();
  if (!gate.ok) return gate.response;

  const { userId } = await ctx.params;
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const limit = url.searchParams.get("limit");

  const page = await listAuditEventsForUser({
    targetUserId: userId,
    cursor,
    limit: limit ? Number(limit) : undefined,
  });

  return NextResponse.json(page);
}
