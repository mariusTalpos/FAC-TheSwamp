"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProblemAlert, StatusBadge } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/api/client";
import type { EventRegistrationSummaryResponse } from "@/lib/events/contracts";
import { useApiResource } from "@/hooks/use-api-resource";

export default function OrganizerRegistrationsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [onBehalfUserId, setOnBehalfUserId] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const { data: summary, error, runMutation } = useApiResource({
    resourceKey: `organizer-registrations-${eventId}`,
    loader: () =>
      apiGet<EventRegistrationSummaryResponse>(`/api/events/${eventId}/registrations`),
  });

  async function withdraw(registrationId: string) {
    const reason = window.prompt("Withdrawal reason (optional)") ?? undefined;
    setLocalError(null);
    await runMutation(() =>
      apiPost(`/api/events/${eventId}/registrations/${registrationId}/withdraw`, {
        reason,
      }),
    );
  }

  async function onBehalf(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    const ok = await runMutation(() =>
      apiPost(`/api/events/${eventId}/registrations/fighter/on-behalf`, {
        userId: onBehalfUserId,
      }),
    );
    if (ok !== null) setOnBehalfUserId("");
  }

  const displayError = localError ?? error;

  return (
    <main>
      <h1>Registration summary</h1>
      <p>
        <Link href={`/organizer/events/${eventId}`}>Event detail</Link>
      </p>
      {displayError ? <ProblemAlert message={displayError} /> : null}

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
                <td>
                  <StatusBadge variant="registration" status={r.status} />
                </td>
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
