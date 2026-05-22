import Link from "next/link";
import { notFound } from "next/navigation";
import { isPublicTeamRosterEnabled } from "@/lib/teams/public-flag";
import { getActiveRoster, getTeamById } from "@/lib/teams/team-service";

export default async function PublicTeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  if (!isPublicTeamRosterEnabled()) notFound();

  const { teamId } = await params;
  const team = await getTeamById(teamId);
  if (!team || team.status !== "active") notFound();

  const roster = await getActiveRoster(teamId);

  return (
    <main>
      <h1>{team.name}</h1>
      {team.region ? <p>Region: {team.region}</p> : null}
      <h2>Active roster</h2>
      <ul>
        {roster.members.map((m) => (
          <li key={m.id}>
            {m.applicantDisplayName ?? "Member"} ({m.memberKind})
          </li>
        ))}
      </ul>
      <p>
        <Link href="/">Home</Link>
      </p>
    </main>
  );
}
