"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { EventRegistrationSummaryResponse } from "@/lib/events/contracts";

export default function OrganizerRegistrationsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [summary, setSummary] = useState<EventRegistrationSummaryResponse | null>(null);
  const [onBehalfUserId, setOnBehalfUserId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/registrations`);
    if (res.ok) setSummary((await res.json()) as EventRegistrationSummaryResponse);
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function withdraw(registrationId: string) {
    const reason = window.prompt("Withdrawal reason (optional)") ?? undefined;
    const res = await fetch(
      `/api/events/${eventId}/registrations/${registrationId}/withdraw`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.message === "string" ? data.message : "Withdraw failed");
      return;
    }
    await load();
  }

  async function onBehalf(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/events/${eventId}/registrations/fighter/on-behalf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: onBehalfUserId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "On-behalf failed");
      return;
    }
    setOnBehalfUserId("");
    await load();
  }

  return (
    <main>
      <h1>Registration summary</h1>
      <p>
        <Link href={`/organizer/events/${eventId}`}>Event detail</Link>
      </p>
      {error ? <p role="alert">{error}</p> : null}

      <form onSubmit={onBehalf} aria-labelledby="on-behalf-heading">
        <h2 id="on-behalf-heading">Register fighter on behalf</h2>
        <label htmlFor="on-behalf-user">User id</label>
        <input
          id="on-behalf-user"
          required
          value={onBehalfUserId}
          onChange={(e) => setOnBehalfUserId(e.target.value)}
        />
        <button type="submit">Register</button>
      </form>

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading">Registrations</h2>
        <table>
          <caption className="sr-only">Event registrations</caption>
          <thead>
            <tr>
              <th scope="col">Kind</th>
              <th scope="col">User</th>
              <th scope="col">Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(summary?.registrations ?? []).map((r) => (
              <tr key={r.id}>
                <td>{r.registrationKind}</td>
                <td>{r.userId}</td>
                <td>{r.status}</td>
                <td>
                  {["submitted", "confirmed", "waitlisted"].includes(r.status) ? (
                    <button type="button" onClick={() => void withdraw(r.id)}>
                      Withdraw
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
