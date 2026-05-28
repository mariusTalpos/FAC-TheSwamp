"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ProblemAlert } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/api/client";
import { useApiResource } from "@/hooks/use-api-resource";

type Member = {
  id: string;
  userId: string;
  memberKind: string;
  applicantDisplayName?: string;
};

export default function CaptainRosterPage() {
  const teamId = useParams().teamId as string;

  const { data, error, runMutation } = useApiResource({
    resourceKey: `captain-roster-${teamId}`,
    loader: () =>
      apiGet<{ members: Member[] }>(`/api/captain/teams/${teamId}/roster`),
  });

  const members = data?.members ?? [];

  async function endMembership(membershipId: string, display: string) {
    if (!window.confirm(`Remove ${display} from the active roster?`)) return;
    await runMutation(() =>
      apiPost(`/api/captain/teams/${teamId}/memberships/${membershipId}/end`),
    );
  }

  return (
    <main>
      <h1>Active roster</h1>
      <p>
        <Link href={`/captain/teams/${teamId}/memberships/history`}>View history (API)</Link>
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Member</th>
            <th scope="col">Kind</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td>{m.applicantDisplayName ?? m.userId}</td>
              <td>
                <span aria-label={`Member kind: ${m.memberKind}`}>{m.memberKind}</span>
              </td>
              <td>
                <button
                  type="button"
                  onClick={() =>
                    void endMembership(m.id, m.applicantDisplayName ?? m.userId)
                  }
                >
                  Remove from roster
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {error ? <ProblemAlert message={error} /> : null}
    </main>
  );
}
