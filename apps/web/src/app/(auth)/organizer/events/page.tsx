"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { EventResponse } from "@/lib/events/contracts";

export default function OrganizerEventsPage() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [startsAt, setStartsAt] = useState("");
  const [venueLabel, setVenueLabel] = useState("");
  const [description, setDescription] = useState("");
  const [confirmationDays, setConfirmationDays] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/events?scope=organizer");
    if (!res.ok) return;
    setEvents((await res.json()) as EventResponse[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        timezone,
        startsAt: new Date(startsAt).toISOString(),
        venueLabel,
        description: description || undefined,
        fighterConfirmationRequiredDaysBefore: confirmationDays
          ? Number(confirmationDays)
          : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Create failed");
      return;
    }
    setMessage(`Created draft event “${data.name as string}”`);
    setName("");
    setStartsAt("");
    setVenueLabel("");
    setDescription("");
    setConfirmationDays("");
    await load();
  }

  return (
    <main>
      <h1>Organizer — events</h1>
      <p>
        <Link href="/me">Back to account</Link>
      </p>

      <section aria-labelledby="create-event-heading">
        <h2 id="create-event-heading">Create event (draft)</h2>
        <form onSubmit={createEvent}>
          <p>
            <label htmlFor="event-name">
              Event name <span aria-hidden="true">*</span>
            </label>
            <br />
            <input id="event-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </p>
          <p>
            <label htmlFor="event-timezone">Timezone (IANA)</label>
            <br />
            <input
              id="event-timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </p>
          <p>
            <label htmlFor="event-starts">Start (local, in event timezone)</label>
            <br />
            <input
              id="event-starts"
              type="datetime-local"
              required
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </p>
          <p>
            <label htmlFor="event-venue">
              Venue <span aria-hidden="true">*</span>
            </label>
            <br />
            <input
              id="event-venue"
              required
              value={venueLabel}
              onChange={(e) => setVenueLabel(e.target.value)}
            />
          </p>
          <p>
            <label htmlFor="event-description">Description (optional)</label>
            <br />
            <textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </p>
          <p>
            <label htmlFor="event-confirm-days">
              Fighter attendance confirmation (days before start, optional)
            </label>
            <br />
            <input
              id="event-confirm-days"
              type="number"
              min={1}
              value={confirmationDays}
              onChange={(e) => setConfirmationDays(e.target.value)}
            />
          </p>
          <button type="submit">Create draft</button>
        </form>
        {error ? <p role="alert">{error}</p> : null}
        {message ? <p>{message}</p> : null}
      </section>

      <section aria-labelledby="my-events-heading">
        <h2 id="my-events-heading">Your events</h2>
        <ul>
          {events.map((ev) => (
            <li key={ev.id}>
              <Link href={`/organizer/events/${ev.id}`}>{ev.name}</Link> — {ev.lifecycleStatus}{" "}
              ({ev.timezone})
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
