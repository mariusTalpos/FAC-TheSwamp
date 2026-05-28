"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProblemAlert, StatusBadge } from "@/components/ui";
import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import type { EventResponse } from "@/lib/events/contracts";
import { useApiResource } from "@/hooks/use-api-resource";

export default function AdminEventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [notes, setNotes] = useState("");
  const [newOrganizerId, setNewOrganizerId] = useState("");

  const { data: event, error, runMutation, reload } = useApiResource({
    resourceKey: `admin-event-${eventId}`,
    loader: () => apiGet<EventResponse>(`/api/events/${eventId}`),
  });

  async function sanction() {
    await runMutation(() =>
      apiPost<EventResponse>(`/api/admin/events/${eventId}/sanction`, {
        sanctioningNotes: notes || undefined,
      }),
    );
  }

  async function revokeSanction() {
    await runMutation(() => apiDelete<EventResponse>(`/api/admin/events/${eventId}/sanction`));
    await reload();
  }

  async function reassign() {
    await runMutation(() =>
      apiPost<EventResponse>(`/api/admin/events/${eventId}/organizer`, {
        newOrganizerUserId: newOrganizerId,
      }),
    );
  }

  if (!event) return <main><p>Loading…</p></main>;

  return (
    <main>
      <h1>Admin — {event.name}</h1>
      <p>
        <Link href="/me">Account</Link> ·{" "}
        <Link href={`/organizer/events/${eventId}/registrations`}>Registrations</Link>
      </p>
      <p>
        Sanctioned: {event.isSanctioned ? "yes" : "no"} · Organizer: {event.organizerUserId} ·{" "}
        <StatusBadge variant="event-lifecycle" status={event.lifecycleStatus} />
      </p>
      {error ? <ProblemAlert message={error} /> : null}

      <section aria-labelledby="sanction-heading">
        <h2 id="sanction-heading">Sanction</h2>
        <label htmlFor="sanction-notes">Notes</label>
        <br />
        <input id="sanction-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <br />
        <button type="button" onClick={() => void sanction()}>
          Mark sanctioned
        </button>{" "}
        <button type="button" onClick={() => void revokeSanction()}>
          Revoke sanction
        </button>
      </section>

      <section aria-labelledby="reassign-heading">
        <h2 id="reassign-heading">Reassign organizer</h2>
        <label htmlFor="new-organizer">New organizer user id</label>
        <br />
        <input
          id="new-organizer"
          value={newOrganizerId}
          onChange={(e) => setNewOrganizerId(e.target.value)}
        />
        <br />
        <button type="button" onClick={() => void reassign()}>
          Reassign
        </button>
      </section>
    </main>
  );
}
