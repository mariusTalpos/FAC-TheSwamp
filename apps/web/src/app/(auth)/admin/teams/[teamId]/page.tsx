"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProblemAlert, StatusBadge, SuccessMessage } from "@/components/ui";
import { apiDelete, apiErrorMessage, apiGet, apiPatch, apiPost } from "@/lib/api/client";

type Team = {
  id: string;
  name: string;
  status: string;
  region?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

type Member = {
  id: string;
  userId: string;
  memberKind: string;
  status: string;
  applicantDisplayName?: string;
};

type UserRow = { id: string; email: string };

type CaptainRow = { userId: string; email: string; validFrom: string };

export default function AdminTeamDetailPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const [team, setTeam] = useState<Team | null>(null);
  const [roster, setRoster] = useState<Member[]>([]);
  const [history, setHistory] = useState<Member[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [captains, setCaptains] = useState<CaptainRow[]>([]);
  const [captainUserId, setCaptainUserId] = useState("");
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [all, rosterData, histData, usersData, captainsData] = await Promise.all([
        apiGet<Team[]>("/api/admin/teams"),
        apiGet<{ members: Member[] }>(`/api/admin/teams/${teamId}/roster`),
        apiGet<{ memberships: Member[] }>(`/api/admin/teams/${teamId}/memberships/history`),
        apiGet<{ items: UserRow[] }>("/api/admin/users"),
        apiGet<{ captains: CaptainRow[] }>(`/api/admin/teams/${teamId}/captains`),
      ]);
      setTeam(all.find((t) => t.id === teamId) ?? null);
      setRoster(rosterData.members);
      setHistory(histData.memberships);
      setUsers(usersData.items);
      setCaptains(captainsData.captains);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not load team"));
    }
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (team) {
      setName(team.name);
      setRegion(team.region ?? "");
    }
  }, [team]);

  const activeCaptainIds = new Set(captains.map((c) => c.userId));
  const assignableUsers = users.filter((u) => !activeCaptainIds.has(u.id));

  async function saveMetadata(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await apiPatch(`/api/admin/teams/${teamId}`, { name, region: region || null });
      setMessage("Team updated.");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Update failed"));
    }
  }

  async function deactivate() {
    if (!window.confirm("Deactivate this team? New applications will be blocked.")) return;
    setError(null);
    setMessage(null);
    try {
      await apiPatch(`/api/admin/teams/${teamId}`, { status: "deactivated" });
      setMessage("Team deactivated.");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Deactivate failed"));
    }
  }

  async function assignCaptain(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await apiPost(`/api/admin/teams/${teamId}/captains`, { userId: captainUserId });
      setMessage("Captain assigned.");
      setCaptainUserId("");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Assign failed"));
    }
  }

  async function revokeCaptain(userId: string, email: string) {
    if (!window.confirm(`Revoke captain role for ${email}?`)) return;
    setError(null);
    setMessage(null);
    try {
      await apiDelete(`/api/admin/teams/${teamId}/captains/${userId}`);
      setMessage(`Captain role revoked for ${email}.`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Revoke failed"));
    }
  }

  async function endMembership(membershipId: string) {
    if (!window.confirm("Remove this member from the active roster?")) return;
    setError(null);
    setMessage(null);
    try {
      await apiPost(`/api/admin/teams/${teamId}/memberships/${membershipId}/end`);
      setMessage("Membership ended.");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "End failed"));
    }
  }

  if (!team) {
    return (
      <main>
        <p>Loading team…</p>
      </main>
    );
  }

  return (
    <main>
      <h1>{team.name}</h1>
      <p>
        Status: <StatusBadge variant="team" status={team.status} />
      </p>
      <p>
        <Link href="/admin/teams">All teams</Link> · <Link href="/me">Account</Link>
      </p>

      {error ? <ProblemAlert message={error} /> : null}
      {message ? <SuccessMessage message={message} /> : null}

      <section aria-labelledby="edit-team-heading">
        <h2 id="edit-team-heading">Edit metadata</h2>
        <form onSubmit={saveMetadata}>
          <p>
            <label htmlFor="edit-name">Name</label>
            <br />
            <input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </p>
          <p>
            <label htmlFor="edit-region">Region</label>
            <br />
            <input id="edit-region" value={region} onChange={(e) => setRegion(e.target.value)} />
          </p>
          <button type="submit">Save</button>
        </form>
        {team.status === "active" ? (
          <p>
            <button type="button" onClick={() => void deactivate()}>
              Deactivate team
            </button>
          </p>
        ) : null}
      </section>

      <section className="stack" aria-labelledby="captain-heading">
        <h2 id="captain-heading">Team captains</h2>
        {captains.length === 0 ? (
          <p id="captains-empty">No captains assigned yet.</p>
        ) : (
          <ul aria-labelledby="captain-heading">
            {captains.map((c) => (
              <li key={c.userId}>
                {c.email}{" "}
                <button
                  type="button"
                  className="secondary"
                  onClick={() => void revokeCaptain(c.userId, c.email)}
                >
                  Revoke captain
                </button>
              </li>
            ))}
          </ul>
        )}

        <h3 id="assign-captain-heading">Assign captain</h3>
        {assignableUsers.length === 0 ? (
          <p id="assign-captain-empty">All listed users are already captains for this team.</p>
        ) : (
          <form className="stack" onSubmit={assignCaptain} aria-labelledby="assign-captain-heading">
            <div className="field">
              <label htmlFor="captain-user">User</label>
              <select
                id="captain-user"
                value={captainUserId}
                onChange={(e) => setCaptainUserId(e.target.value)}
                required
              >
                <option value="">Select user…</option>
                {assignableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit">Assign captain</button>
          </form>
        )}
      </section>

      <section aria-labelledby="roster-heading">
        <h2 id="roster-heading">Active roster</h2>
        <ul>
          {roster.map((m) => (
            <li key={m.id}>
              {m.applicantDisplayName ?? m.userId} ({m.memberKind}){" "}
              <button type="button" onClick={() => void endMembership(m.id)}>
                Remove from roster
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="history-heading">
        <h2 id="history-heading">Membership history</h2>
        <ul>
          {history.map((m) => (
            <li key={m.id}>
              {m.applicantDisplayName ?? m.userId} — {m.status} ({m.memberKind})
            </li>
          ))}
        </ul>
      </section>

    </main>
  );
}
