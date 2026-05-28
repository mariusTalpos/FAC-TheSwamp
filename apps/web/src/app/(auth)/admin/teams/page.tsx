"use client";

import { useState } from "react";
import Link from "next/link";
import { ProblemAlert, StatusBadge, SuccessMessage } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/api/client";
import { useApiResource } from "@/hooks/use-api-resource";

type Team = {
  id: string;
  name: string;
  status: string;
  region?: string | null;
};

export default function AdminTeamsPage() {
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const { data: teams, error, runMutation } = useApiResource({
    resourceKey: "admin-teams",
    loader: () => apiGet<Team[]>("/api/admin/teams"),
  });

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const created = await runMutation(() =>
      apiPost<Team>("/api/admin/teams", {
        name,
        region: region || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
      }),
    );
    if (created) {
      setMessage(`Created team ${created.name}`);
      setName("");
      setRegion("");
      setContactEmail("");
      setContactPhone("");
    }
  }

  return (
    <main>
      <h1>Teams (FAC admin)</h1>
      <p>
        <Link href="/admin/teams/overview">Teams overview (table)</Link> ·{" "}
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

      {error ? <ProblemAlert message={error} /> : null}
      {message ? <SuccessMessage message={message} /> : null}

      <section aria-labelledby="team-list-heading">
        <h2 id="team-list-heading">All teams</h2>
        <ul>
          {(teams ?? []).map((t) => (
            <li key={t.id}>
              <Link href={`/admin/teams/${t.id}`}>{t.name}</Link> —{" "}
              <StatusBadge variant="team" status={t.status} />
              {t.region ? ` (${t.region})` : ""}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
