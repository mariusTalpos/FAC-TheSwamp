"use client";

import { useState } from "react";
import Link from "next/link";
import { ProblemAlert, SuccessMessage } from "@/components/ui";
import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import { useApiResource } from "@/hooks/use-api-resource";

type UserRow = { id: string; email: string; status: string };

export default function AdminUsersPage() {
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"direct_active" | "email_invitation">("direct_active");
  const [initialPassword, setInitialPassword] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [roleKey, setRoleKey] = useState("marshal");
  const [message, setMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const { data, error, runMutation } = useApiResource({
    resourceKey: "admin-users",
    loader: () => apiGet<{ items: UserRow[] }>("/api/admin/users"),
  });

  const users = data?.items ?? [];
  const displayError = localError ?? error;

  async function provision() {
    setLocalError(null);
    setMessage(null);
    const body =
      mode === "direct_active"
        ? { provisionMode: mode, email, initialPassword }
        : { provisionMode: mode, email };
    const created = await runMutation(() =>
      apiPost<{ userId: string }>("/api/admin/users", body),
    );
    if (created) setMessage(`Created user ${created.userId}`);
  }

  async function assignRole() {
    setLocalError(null);
    setMessage(null);
    const ok = await runMutation(() =>
      apiPost(`/api/admin/users/${targetUserId}/roles`, { operationalRoleKey: roleKey }),
    );
    if (ok !== null) setMessage("Role assigned.");
  }

  async function revokeRole() {
    if (!window.confirm("Revoke this role from the user?")) return;
    setLocalError(null);
    setMessage(null);
    const ok = await runMutation(() =>
      apiDelete(`/api/admin/users/${targetUserId}/roles`, { operationalRoleKey: roleKey }),
    );
    if (ok !== null) setMessage("Role revoked.");
  }

  async function deactivate() {
    if (
      !window.confirm(
        "Deactivate this account? They will no longer be able to sign in.",
      )
    ) {
      return;
    }
    setLocalError(null);
    setMessage(null);
    const ok = await runMutation(() =>
      apiPost(`/api/admin/users/${targetUserId}/deactivate`),
    );
    if (ok !== null) setMessage("User deactivated.");
  }

  return (
    <main>
      <h1>Admin — users</h1>
      {displayError ? <ProblemAlert message={displayError} /> : null}
      {message ? <SuccessMessage message={message} /> : null}

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
