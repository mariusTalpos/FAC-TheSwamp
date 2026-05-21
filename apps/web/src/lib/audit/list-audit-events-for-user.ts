import { and, asc, eq, gt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";

export type AuditListParams = {
  targetUserId: string;
  cursor?: string | null;
  limit?: number;
};

export type AuditPage = {
  items: {
    id: string;
    eventType: string;
    actorUserId: string | null;
    targetUserId: string | null;
    payload: Record<string, unknown>;
    createdAt: string;
  }[];
  nextCursor: string | null;
};

export async function listAuditEventsForUser(params: AuditListParams): Promise<AuditPage> {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
  const cursorId = params.cursor ? BigInt(params.cursor) : null;

  const rows = await db
    .select()
    .from(auditEvents)
    .where(
      and(
        or(
          eq(auditEvents.targetUserId, params.targetUserId),
          eq(auditEvents.actorUserId, params.targetUserId),
        ),
        cursorId ? gt(auditEvents.id, cursorId) : sql`true`,
      ),
    )
    .orderBy(asc(auditEvents.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows[pageRows.length - 1];
  const nextCursor = hasMore && last ? String(last.id) : null;

  return {
    items: pageRows.map((r) => ({
      id: String(r.id),
      eventType: r.eventType,
      actorUserId: r.actorUserId,
      targetUserId: r.targetUserId,
      payload: (r.payload ?? {}) as Record<string, unknown>,
      createdAt: r.createdAt.toISOString(),
    })),
    nextCursor,
  };
}
