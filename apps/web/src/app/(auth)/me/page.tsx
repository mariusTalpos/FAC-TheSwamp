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
  const isMarshal = session.user.roleKeys?.includes("marshal");
  const roleKeys = session.user.roleKeys ?? [];

  return (
    <main>
      <h1>Welcome</h1>
      <p>Signed in as {session.user.email}</p>
      <ul>
        <li>
          <Link href="/me/fighter-profile">Fighter profile</Link>
        </li>
        {!isMarshal || roleKeys.includes("fighter") || roleKeys.length === 0 ? (
          <li>
            <Link href="/me/team-affiliation">Team affiliation</Link>
            {!isMarshal ? (
              <span> — fighters apply to teams; you are unaffiliated until approved</span>
            ) : (
              <span> — optional for marshal accounts without a team</span>
            )}
          </li>
        ) : (
          <li>
            <span>Marshal access does not require team membership.</span>
          </li>
        )}
        {isAdmin ? (
          <>
            <li>
              <Link href="/admin/users">Admin — users</Link>
            </li>
            <li>
              <Link href="/admin/teams">Admin — teams</Link>
            </li>
          </>
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
