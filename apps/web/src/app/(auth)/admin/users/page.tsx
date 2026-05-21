"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type UserRow = { id: string; email: string; status: string };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"direct_active" | "email_invitation">("direct_active");
  const [initialPassword, setInitialPassword] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [roleKey, setRoleKey] = useState("marshal");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (!res.ok) return;
    const data = (await res.json()) as { items: UserRow[] };
    setUsers(data.items);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function provision() {
    setError(null);
    setMessage(null);
    const body =
      mode === "direct_active"
        ? { provisionMode: mode, email, initialPassword }
        : { provisionMode: mode, email };
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Provision failed");
      return;
    }
    setMessage(`Created user ${data.userId as string}`);
    await load();
  }

  async function assignRole() {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/users/${targetUserId}/roles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operationalRoleKey: roleKey }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.message === "string" ? data.message : "Assign failed");
      return;
    }
    setMessage("Role assigned.");
  }

  async function revokeRole() {
    if (!window.confirm("Revoke this role from the user?")) return;
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/users/${targetUserId}/roles`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operationalRoleKey: roleKey }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.message === "string" ? data.message : "Revoke failed");
      return;
    }
    setMessage("Role revoked.");
  }

  async function deactivate() {
    if (
      !window.confirm(
        "Deactivate this account? They will no longer be able to sign in.",
      )
    ) {
      return;
    }
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/users/${targetUserId}/deactivate`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.message === "string" ? data.message : "Deactivate failed");
      return;
    }
    setMessage("User deactivated.");
    await load();
  }

  return (
    <main>
      <h1>Admin — users</h1>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="success" role="status">
          {message}
        </p>
      ) : null}

      <section className="stack" aria-labelledby="provision-heading">
        <h2 id="provision-heading">Provision user</h2>
        <div className="field">
          <label htmlFor="provision-email">Email</label>
          <input
            id="provision-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
        </div>
        <div className="field">
          <label htmlFor="provision-mode">Provision mode</label>
          <select
            id="provision-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
          >
            <option value="direct_active">direct active</option>
            <option value="email_invitation">email invitation</option>
          </select>
        </div>
        {mode === "direct_active" ? (
          <div className="field">
            <label htmlFor="initial-password">Initial password</label>
            <input
              id="initial-password"
              type="password"
              minLength={10}
              value={initialPassword}
              onChange={(e) => setInitialPassword(e.target.value)}
            />
          </div>
        ) : null}
        <button type="button" onClick={() => void provision()}>
          Create user
        </button>
      </section>

      <section className="stack" aria-labelledby="roles-heading">
        <h2 id="roles-heading">Roles &amp; lifecycle</h2>
        <div className="field">
          <label htmlFor="target-user">Target user id</label>
          <input
            id="target-user"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="role-key">Operational role key</label>
          <input id="role-key" value={roleKey} onChange={(e) => setRoleKey(e.target.value)} />
        </div>
        <div className="stack" style={{ flexDirection: "row", flexWrap: "wrap", gap: "0.5rem" }}>
          <button type="button" onClick={() => void assignRole()}>
            Assign role
          </button>
          <button type="button" className="secondary" onClick={() => void revokeRole()}>
            Revoke role
          </button>
          <button type="button" className="secondary" onClick={() => void deactivate()}>
            Deactivate account
          </button>
          <Link href={targetUserId ? `/admin/users/${targetUserId}` : "#"}>Open user</Link>
        </div>
      </section>

      <section aria-labelledby="list-heading">
        <h2 id="list-heading">Directory</h2>
        <ul>
          {users.map((u) => (
            <li key={u.id}>
              <Link href={`/admin/users/${u.id}`}>{u.email}</Link> — {u.status}
            </li>
          ))}
        </ul>
      </section>

      <p>
        <Link href="/me">Back</Link>
      </p>
    </main>
  );
}
