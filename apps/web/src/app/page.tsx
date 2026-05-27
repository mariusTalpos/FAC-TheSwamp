import Link from "next/link";
import { auth } from "@/lib/auth/auth.config";

export default async function HomePage() {
  const session = await auth();
  const isAdmin = session?.user.roleKeys?.includes("fac_admin");

  return (
    <main>
      <h1>FAC-App</h1>
      <p>Foundation slice: identity, roles, and audit.</p>
      <ul>
        <li>
          <Link href="/register/fighter">Fighter registration</Link>
        </li>
        <li>
          <Link href="/login">Sign in</Link>
        </li>
        {session?.user ? (
          <li>
            <Link href="/me">Account home</Link>
          </li>
        ) : null}
        {isAdmin ? (
          <li>
            <Link href="/admin/users">Admin — users</Link>
          </li>
        ) : null}
      </ul>
    </main>
  );
}
