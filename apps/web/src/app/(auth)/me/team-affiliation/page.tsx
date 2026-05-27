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

function AffiliationBlock({
  title,
  slot,
  applyKind,
  teams,
  onWithdraw,
  onApply,
}: {
  title: string;
  slot?: AffiliationSlot;
  applyKind: "fighter" | "squire";
  teams: Team[];
  onWithdraw: (membershipId: string) => Promise<void>;
  onApply: (teamId: string, memberKind: "fighter" | "squire") => Promise<void>;
}) {
  const [selectedTeam, setSelectedTeam] = useState("");

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    await onApply(selectedTeam, applyKind);
    setSelectedTeam("");
  }

  const status = slot?.status ?? "unaffiliated";

  return (
    <section aria-labelledby={`${applyKind}-aff-heading`}>
      <h2 id={`${applyKind}-aff-heading`}>{title}</h2>
      {status === "unaffiliated" ? (
        <p>
          You are <strong>unaffiliated</strong> — not on a team roster yet. Apply to one team at a
          time; a captain must approve before you appear on the active roster.
        </p>
      ) : status === "pending" ? (
        <>
          <p>
            Pending approval on <strong>{slot?.teamName}</strong>. You may only have one open
            application at a time.
          </p>
          {slot?.membershipId ? (
            <p>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Cancel your pending application to ${slot.teamName}? You can apply to another team after.`,
                    )
                  ) {
                    void onWithdraw(slot.membershipId!);
                  }
                }}
              >
                Cancel application
              </button>
            </p>
          ) : null}
        </>
      ) : (
        <p>
          Active member of <strong>{slot?.teamName}</strong>.
        </p>
      )}

      {status === "unaffiliated" ? (
        <div aria-labelledby={`${applyKind}-apply-heading`}>
          <h3 id={`${applyKind}-apply-heading`}>Apply to a team</h3>
          <form onSubmit={apply}>
            <p>
              <label htmlFor={`${applyKind}-apply-team`}>Team</label>
              <br />
              <select
                id={`${applyKind}-apply-team`}
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
            <button type="submit">Submit application</button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

export default function TeamAffiliationPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [roster, setRoster] = useState<RosterMember[]>([]);
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

  async function applyToTeam(teamId: string, memberKind: "fighter" | "squire") {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/me/team-memberships/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, memberKind }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Application failed");
      return;
    }
    setMessage("Application submitted.");
    await load();
  }

  async function withdrawApplication(membershipId: string) {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/me/team-memberships/${membershipId}/withdraw`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Could not cancel application");
      return;
    }
    setMessage("Application cancelled. You may apply to another team.");
    await load();
  }

  const fighter = summary?.fighter;

  return (
    <main>
      <h1>Team affiliation</h1>
      <p>
        <Link href="/me">Back to account</Link>
      </p>

      <AffiliationBlock
        title="Fighter affiliation"
        slot={fighter}
        applyKind="fighter"
        teams={teams}
        onWithdraw={withdrawApplication}
        onApply={applyToTeam}
      />

      {summary?.squire ? (
        <AffiliationBlock
          title="Squire affiliation"
          slot={summary.squire}
          applyKind="squire"
          teams={teams}
          onWithdraw={withdrawApplication}
          onApply={applyToTeam}
        />
      ) : null}

      {error ? (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}

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
    </main>
  );
}
