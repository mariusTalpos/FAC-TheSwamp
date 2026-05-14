import { db } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";

export type InsertAuditEventInput = {
  eventType: string;
  actorUserId?: string | null;
  targetUserId?: string | null;
  payload?: Record<string, unknown>;
};

/** Append-only audit writer (no UPDATE/DELETE on `audit_event`). */
export async function insertAuditEvent(input: InsertAuditEventInput) {
  await db.insert(auditEvents).values({
    eventType: input.eventType,
    actorUserId: input.actorUserId ?? null,
    targetUserId: input.targetUserId ?? null,
    payload: input.payload ?? {},
  });
}
