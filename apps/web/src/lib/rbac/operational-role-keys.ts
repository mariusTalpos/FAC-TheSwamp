import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { operationalRoles, roleAssignments } from "@/lib/db/schema";

export async function getOperationalRoleKeysForUser(userId: string): Promise<string[]> {
  const rows = await db
    .select({ key: operationalRoles.key })
    .from(roleAssignments)
    .innerJoin(operationalRoles, eq(roleAssignments.operationalRoleId, operationalRoles.id))
    .where(and(eq(roleAssignments.userId, userId), isNull(roleAssignments.validTo)));

  return rows.map((r) => r.key);
}
