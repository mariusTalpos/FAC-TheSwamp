"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Member = {
  id: string;
  userId: string;
  memberKind: string;
  applicantDisplayName?: string;
};

export default function CaptainRosterPage() {
  const teamId = useParams().teamId as string;
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/captain/teams/${teamId}/roster`);
    if (!res.ok) return;
    const data = (await res.json()) as { members: Member[] };
    setMembers(data.members);
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function endMembership(membershipId: string, display: string) {
    if (!window.confirm(`Remove ${display} from the active roster?`)) return;
    setError(null);
    const res = await fetch(`/api/captain/teams/${teamId}/memberships/${membershipId}/end`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Remove failed");
      return;
    }
    await load();
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
      {error ? (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      ) : null}
    </main>
  );
}
