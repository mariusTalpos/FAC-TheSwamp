"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type AffiliationSlot = {
  status: string;
  teamId?: string;
  teamName?: string;
  membershipId?: string;
};

type Summary = {
  fighter?: AffiliationSlot;
  squire?: AffiliationSlot;
};

type Team = { id: string; name: string };
type RosterMember = { userId: string; memberKind: string; applicantDisplayName?: string };

export default function TeamAffiliationPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [applyKind, setApplyKind] = useState<"fighter" | "squire">("fighter");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [affRes, teamsRes] = await Promise.all([
      fetch("/api/me/team-affiliation"),
      fetch("/api/teams"),
    ]);
    if (teamsRes.ok) setTeams((await teamsRes.json()) as Team[]);
    if (!affRes.ok) return;
    const s = (await affRes.json()) as Summary;
    setSummary(s);
    if (s.fighter?.status === "active" && s.fighter.teamId) {
      const r = await fetch(`/api/me/teams/${s.fighter.teamId}/roster`);
      if (r.ok) {
        const data = (await r.json()) as { members: RosterMember[] };
        setRoster(data.members);
      }
    } else {
      setRoster([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch("/api/me/team-memberships/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: selectedTeam, memberKind: applyKind }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Application failed");
      return;
    }
    setMessage("Application submitted.");
    await load();
  }

  const fighter = summary?.fighter;
  const squire = summary?.squire;

  return (
    <main>
      <h1>Team affiliation</h1>
      <p>
        <Link href="/me">Back to account</Link>
      </p>

      <section aria-labelledby="fighter-aff-heading">
        <h2 id="fighter-aff-heading">Fighter affiliation</h2>
        {!fighter || fighter.status === "unaffiliated" ? (
          <p>
            You are <strong>unaffiliated</strong> — not on a team roster yet. Apply to a team
            below; a captain must approve before you appear on the active roster.
          </p>
        ) : fighter.status === "pending" ? (
          <p>
            Pending approval on <strong>{fighter.teamName}</strong>.
          </p>
        ) : (
          <p>
            Active member of <strong>{fighter.teamName}</strong>.
          </p>
        )}
      </section>

      {squire ? (
        <section aria-labelledby="squire-aff-heading">
          <h2 id="squire-aff-heading">Squire affiliation</h2>
          {squire.status === "unaffiliated" ? (
            <p>No active squire team membership.</p>
          ) : (
            <p>
              Squire status: <strong>{squire.status}</strong>
              {squire.teamName ? ` on ${squire.teamName}` : ""}
            </p>
          )}
        </section>
      ) : null}

      {(fighter?.status === "unaffiliated" || fighter?.status === "pending") && (
        <section aria-labelledby="apply-heading">
          <h2 id="apply-heading">Apply to a team</h2>
          <form onSubmit={apply}>
            <p>
              <label htmlFor="apply-team">Team</label>
              <br />
              <select
                id="apply-team"
                required
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                <option value="">Select team…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </p>
            <p>
              <label htmlFor="apply-kind">Apply as</label>
              <br />
              <select
                id="apply-kind"
                value={applyKind}
                onChange={(e) => setApplyKind(e.target.value as "fighter" | "squire")}
              >
                <option value="fighter">Fighter</option>
                <option value="squire">Squire</option>
              </select>
            </p>
            <button type="submit">Submit application</button>
          </form>
        </section>
      )}

      {fighter?.status === "active" && roster.length > 0 ? (
        <section aria-labelledby="peer-roster-heading">
          <h2 id="peer-roster-heading">Teammates on your roster</h2>
          <p>Approved active members (pending applicants are not listed).</p>
          <ul>
            {roster.map((m) => (
              <li key={m.userId}>
                {m.applicantDisplayName ?? m.userId} ({m.memberKind})
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {error ? (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </main>
  );
}
