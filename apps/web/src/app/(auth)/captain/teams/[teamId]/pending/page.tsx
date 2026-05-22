"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Pending = {
  id: string;
  userId: string;
  memberKind: string;
  applicantDisplayName?: string;
};

export default function CaptainPendingPage() {
  const teamId = useParams().teamId as string;
  const [items, setItems] = useState<Pending[]>([]);
  const [filter, setFilter] = useState<"all" | "fighter" | "squire">("all");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/captain/teams/${teamId}/pending`);
    if (!res.ok) return;
    const data = (await res.json()) as { items: Pending[] };
    setItems(data.items);
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = items.filter((i) => filter === "all" || i.memberKind === filter);

  async function decide(membershipId: string, decision: "approve" | "reject") {
    const label = decision === "approve" ? "Approve" : "Reject";
    if (!window.confirm(`${label} this application?`)) return;
    setError(null);
    const res = await fetch(`/api/captain/teams/${teamId}/memberships/${membershipId}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note: note || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : `${label} failed`);
      return;
    }
    setNote("");
    await load();
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
      {error ? (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      ) : null}
    </main>
  );
}
