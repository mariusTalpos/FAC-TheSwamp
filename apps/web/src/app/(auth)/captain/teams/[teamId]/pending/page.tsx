"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ProblemAlert } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/api/client";
import { useApiResource } from "@/hooks/use-api-resource";

type Pending = {
  id: string;
  userId: string;
  memberKind: string;
  applicantDisplayName?: string;
};

export default function CaptainPendingPage() {
  const teamId = useParams().teamId as string;
  const [filter, setFilter] = useState<"all" | "fighter" | "squire">("all");
  const [note, setNote] = useState("");

  const { data, error, runMutation } = useApiResource({
    resourceKey: `captain-pending-${teamId}`,
    loader: () => apiGet<{ items: Pending[] }>(`/api/captain/teams/${teamId}/pending`),
  });

  const items = data?.items ?? [];
  const filtered = items.filter((i) => filter === "all" || i.memberKind === filter);

  async function decide(membershipId: string, decision: "approve" | "reject") {
    const label = decision === "approve" ? "Approve" : "Reject";
    if (!window.confirm(`${label} this application?`)) return;
    await runMutation(() =>
      apiPost(`/api/captain/teams/${teamId}/memberships/${membershipId}/decide`, {
        decision,
        note: note || undefined,
      }),
    );
    setNote("");
  }

  return (
    <main>
      <h1>Pending applications</h1>
      <p>
        <label htmlFor="kind-filter">Filter by kind</label>{" "}
        <select
          id="kind-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
        >
          <option value="all">All</option>
          <option value="fighter">Fighter</option>
          <option value="squire">Squire</option>
        </select>
      </p>
      <p>
        <label htmlFor="decision-note">Optional note (reject)</label>
        <br />
        <input id="decision-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </p>
      <ul>
        {filtered.map((p) => (
          <li key={p.id}>
            {p.applicantDisplayName ?? p.userId} — <strong>{p.memberKind}</strong>{" "}
            <button type="button" onClick={() => void decide(p.id, "approve")}>
              Approve
            </button>{" "}
            <button type="button" onClick={() => void decide(p.id, "reject")}>
              Reject
            </button>
          </li>
        ))}
      </ul>
      {error ? <ProblemAlert message={error} /> : null}
    </main>
  );
}
