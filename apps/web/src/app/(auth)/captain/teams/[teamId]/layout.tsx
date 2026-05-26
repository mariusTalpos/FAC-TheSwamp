import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth.config";
import { isCaptainOfTeam } from "@/lib/teams/permissions";

export default async function CaptainTeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ teamId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { teamId } = await params;
  const isAdmin = session.user.roleKeys?.includes("fac_admin");
  const isCaptain = await isCaptainOfTeam(teamId, session.user.id);

  if (!isCaptain && !isAdmin) {
    redirect("/me");
  }

  return (
    <div>
      <nav aria-label="Captain team">
        <Link href={`/captain/teams/${teamId}/pending`}>Pending applications</Link>
        {" · "}
        <Link href={`/captain/teams/${teamId}/roster`}>Active roster</Link>
        {" · "}
        <Link href="/me">Account</Link>
      </nav>
      {children}
    </div>
  );
}
