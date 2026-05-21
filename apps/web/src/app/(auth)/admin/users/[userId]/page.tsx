import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth.config";
import { db } from "@/lib/db";
import { fighterProfiles } from "@/lib/db/schema";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth();
  if (!session?.user.roleKeys?.includes("fac_admin")) {
    redirect("/login");
  }
  const { userId } = await params;

  const [fp] = await db
    .select()
    .from(fighterProfiles)
    .where(eq(fighterProfiles.userId, userId))
    .limit(1);

  return (
    <main>
      <h1>User</h1>
      <p>User id: {userId}</p>
      {fp ? (
        <section>
          <h2>Fighter profile (admin read)</h2>
          <p>
            Display name: <strong>{fp.displayName}</strong>
          </p>
          <p>Completion: {fp.completionState}</p>
          <pre style={{ fontSize: "0.85rem", overflow: "auto" }}>
            {JSON.stringify(fp.visibility ?? {}, null, 2)}
          </pre>
        </section>
      ) : (
        <p>No fighter profile on this account.</p>
      )}
      <ul>
        <li>
          <Link href={`/admin/users/${userId}/audit`}>Audit trail</Link>
        </li>
      </ul>
      <p>
        <Link href="/admin/users">Back to directory</Link>
      </p>
    </main>
  );
}
