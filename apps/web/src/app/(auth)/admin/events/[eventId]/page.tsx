"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { EventResponse } from "@/lib/events/contracts";

export default function AdminEventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [notes, setNotes] = useState("");
  const [newOrganizerId, setNewOrganizerId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}`);
    if (res.ok) setEvent((await res.json()) as EventResponse);
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sanction() {
    setError(null);
    const res = await fetch(`/api/admin/events/${eventId}/sanction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sanctioningNotes: notes || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Sanction failed");
      return;
    }
    setEvent(data as EventResponse);
  }

  async function revokeSanction() {
    const res = await fetch(`/api/admin/events/${eventId}/sanction`, { method: "DELETE" });
    if (res.ok) setEvent((await res.json()) as EventResponse);
  }

  async function reassign() {
    setError(null);
    const res = await fetch(`/api/admin/events/${eventId}/organizer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newOrganizerUserId: newOrganizerId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Reassign failed");
      return;
    }
    setEvent(data as EventResponse);
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
        Sanctioned: {event.isSanctioned ? "yes" : "no"} · Organizer: {event.organizerUserId}
      </p>
      {error ? <p role="alert">{error}</p> : null}

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
