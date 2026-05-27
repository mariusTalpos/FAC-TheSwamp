"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { EventResponse } from "@/lib/events/contracts";

export default function OrganizerEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}`);
    if (!res.ok) {
      setError("Could not load event");
      return;
    }
    setEvent((await res.json()) as EventResponse);
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(path: string, body?: object) {
    setError(null);
    const res = await fetch(`/api/events/${eventId}/${path}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Action failed");
      return;
    }
    setEvent(data as EventResponse);
  }

  if (!event) {
    return (
      <main>
        <p>{error ?? "Loading…"}</p>
      </main>
    );
  }

  return (
    <main>
      <h1>{event.name}</h1>
      <p>
        <Link href="/organizer/events">All organizer events</Link> ·{" "}
        <Link href={`/organizer/events/${eventId}/registrations`}>Registrations</Link> ·{" "}
        <Link href={`/organizer/events/${eventId}/schedule`}>Schedule</Link>
      </p>
      <p>
        Status: <strong>{event.lifecycleStatus}</strong> · Timezone: {event.timezone} · Starts:{" "}
        {event.startsAt}
      </p>
      <p>Venue: {event.venueLabel}</p>
      {event.description ? <p>{event.description}</p> : null}
      {error ? <p role="alert">{error}</p> : null}

      <section aria-labelledby="lifecycle-heading">
        <h2 id="lifecycle-heading">Lifecycle</h2>
        <ul>
          {event.lifecycleStatus === "draft" ? (
            <li>
              <button type="button" onClick={() => void action("publish")}>
                Publish event
              </button>
            </li>
          ) : null}
          {event.lifecycleStatus === "published" ? (
            <li>
              <button type="button" onClick={() => void action("close-registration")}>
                Close registration
              </button>
            </li>
          ) : null}
          {event.lifecycleStatus === "registration_closed" ? (
            <li>
              <button type="button" onClick={() => void action("reopen-registration")}>
                Reopen registration
              </button>
            </li>
          ) : null}
          {["published", "registration_closed"].includes(event.lifecycleStatus) ? (
            <li>
              <button type="button" onClick={() => void action("start")}>
                Start event
              </button>
            </li>
          ) : null}
          {event.lifecycleStatus === "in_progress" ? (
            <li>
              <button type="button" onClick={() => void action("complete")}>
                Complete event
              </button>
            </li>
          ) : null}
        </ul>
      </section>

      <section aria-labelledby="cancel-heading">
        <h2 id="cancel-heading">Cancel event</h2>
        <label htmlFor="cancel-reason">Cancellation reason (optional)</label>
        <br />
        <input
          id="cancel-reason"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
        />
        <br />
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Cancel this event for all registrants?")) {
              void action("cancel", { reason: cancelReason || undefined });
            }
          }}
        >
          Cancel event
        </button>
      </section>
    </main>
  );
}
