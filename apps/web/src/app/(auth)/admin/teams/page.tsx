"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Team = {
  id: string;
  name: string;
  status: string;
  region?: string | null;
};

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/teams");
    if (!res.ok) return;
    setTeams((await res.json()) as Team[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        region: region || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Create failed");
      return;
    }
    setMessage(`Created team ${data.name as string}`);
    setName("");
    setRegion("");
    setContactEmail("");
    setContactPhone("");
    await load();
  }

  return (
    <main>
      <h1>Teams (FAC admin)</h1>
      <p>
        <Link href="/me">Back to account</Link>
      </p>

      <section aria-labelledby="create-team-heading">
        <h2 id="create-team-heading">Create team</h2>
        <form onSubmit={createTeam}>
          <p>
            <label htmlFor="team-name">
              Team name <span aria-hidden="true">*</span>
            </label>
            <br />
            <input
              id="team-name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </p>
          <p>
            <label htmlFor="team-region">Region</label>
            <br />
            <input
              id="team-region"
              name="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </p>
          <p>
            <label htmlFor="team-email">Contact email</label>
            <br />
            <input
              id="team-email"
              name="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </p>
          <p>
            <label htmlFor="team-phone">Contact phone</label>
            <br />
            <input
              id="team-phone"
              name="contactPhone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </p>
          <button type="submit">Create team</button>
        </form>
      </section>

      {error ? (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}

      <section aria-labelledby="team-list-heading">
        <h2 id="team-list-heading">All teams</h2>
        <ul>
          {teams.map((t) => (
            <li key={t.id}>
              <Link href={`/admin/teams/${t.id}`}>{t.name}</Link> — {t.status}
              {t.region ? ` (${t.region})` : ""}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
