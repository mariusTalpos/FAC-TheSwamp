import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { operationalRoles, roleAssignments } from "@/lib/db/schema";
import { FAC_ADMIN_ROLE_KEY } from "@/lib/rbac/require-fac-admin";

export async function countActiveFacAdmins(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(roleAssignments)
    .innerJoin(operationalRoles, eq(roleAssignments.operationalRoleId, operationalRoles.id))
    .where(
      and(eq(operationalRoles.key, FAC_ADMIN_ROLE_KEY), isNull(roleAssignments.validTo)),
    );
  return row?.n ?? 0;
}

export async function userHasActiveFacAdmin(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: roleAssignments.id })
    .from(roleAssignments)
    .innerJoin(operationalRoles, eq(roleAssignments.operationalRoleId, operationalRoles.id))
    .where(
      and(
        eq(roleAssignments.userId, userId),
        eq(operationalRoles.key, FAC_ADMIN_ROLE_KEY),
        isNull(roleAssignments.validTo),
      ),
    )
    .limit(1);
  return Boolean(row);
}
