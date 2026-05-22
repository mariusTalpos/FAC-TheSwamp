"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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

export default function AdminTeamDetailPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const [team, setTeam] = useState<Team | null>(null);
  const [roster, setRoster] = useState<Member[]>([]);
  const [history, setHistory] = useState<Member[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [captainUserId, setCaptainUserId] = useState("");
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [teamsRes, rosterRes, histRes, usersRes] = await Promise.all([
      fetch("/api/admin/teams"),
      fetch(`/api/admin/teams/${teamId}/roster`),
      fetch(`/api/admin/teams/${teamId}/memberships/history`),
      fetch("/api/admin/users"),
    ]);
    if (teamsRes.ok) {
      const all = (await teamsRes.json()) as Team[];
      setTeam(all.find((t) => t.id === teamId) ?? null);
    }
    if (rosterRes.ok) {
      const data = (await rosterRes.json()) as { members: Member[] };
      setRoster(data.members);
    }
    if (histRes.ok) {
      const data = (await histRes.json()) as { memberships: Member[] };
      setHistory(data.memberships);
    }
    if (usersRes.ok) {
      const data = (await usersRes.json()) as { items: UserRow[] };
      setUsers(data.items);
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

  async function saveMetadata(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/admin/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, region: region || null }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Update failed");
      return;
    }
    setMessage("Team updated.");
    await load();
  }

  async function deactivate() {
    if (!window.confirm("Deactivate this team? New applications will be blocked.")) return;
    setError(null);
    const res = await fetch(`/api/admin/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "deactivated" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.message === "string" ? data.message : "Deactivate failed");
      return;
    }
    setMessage("Team deactivated.");
    await load();
  }

  async function assignCaptain(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/admin/teams/${teamId}/captains`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: captainUserId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Assign failed");
      return;
    }
    setMessage("Captain assigned.");
    setCaptainUserId("");
  }

  async function revokeCaptain(userId: string) {
    if (!window.confirm("Revoke captain role for this user?")) return;
    setError(null);
    const res = await fetch(`/api/admin/teams/${teamId}/captains/${userId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Revoke failed");
      return;
    }
    setMessage("Captain revoked.");
  }

  async function endMembership(membershipId: string) {
    if (!window.confirm("Remove this member from the active roster?")) return;
    setError(null);
    const res = await fetch(`/api/admin/teams/${teamId}/memberships/${membershipId}/end`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "End failed");
      return;
    }
    setMessage("Membership ended.");
    await load();
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
        Status: <strong>{team.status}</strong>
      </p>
      <p>
        <Link href="/admin/teams">All teams</Link> · <Link href="/me">Account</Link>
      </p>

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

      <section aria-labelledby="captain-heading">
        <h2 id="captain-heading">Assign captain</h2>
        <form onSubmit={assignCaptain}>
          <label htmlFor="captain-user">User</label>
          <select
            id="captain-user"
            value={captainUserId}
            onChange={(e) => setCaptainUserId(e.target.value)}
            required
          >
            <option value="">Select user…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>{" "}
          <button type="submit">Assign captain</button>
        </form>
        <p>
          <small>Revoke: use user id from roster or users list with DELETE API (UI: enter id)</small>
        </p>
        <p>
          <label htmlFor="revoke-captain-id">Revoke captain user id</label>{" "}
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("revoke-captain-id") as HTMLInputElement;
              if (el?.value) void revokeCaptain(el.value);
            }}
          >
            Revoke
          </button>
          <br />
          <input id="revoke-captain-id" aria-label="Captain user id to revoke" />
        </p>
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

      {error ? (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </main>
  );
}
