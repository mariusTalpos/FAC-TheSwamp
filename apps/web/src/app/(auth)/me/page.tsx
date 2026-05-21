import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth.config";
import { SignOutButton } from "@/components/sign-out-button";

export default async function MePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const isAdmin = session.user.roleKeys?.includes("fac_admin");

  return (
    <main>
      <h1>Welcome</h1>
      <p>Signed in as {session.user.email}</p>
      <ul>
        <li>
          <Link href="/me/fighter-profile">Fighter profile</Link>
        </li>
        {isAdmin ? (
          <li>
            <Link href="/admin/users">Admin — users</Link>
          </li>
        ) : null}
        <li>
          <SignOutButton />
        </li>
      </ul>
      <p>
        <Link href="/">Home</Link>
      </p>
    </main>
  );
}
