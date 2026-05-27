"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { EventListItem } from "@/lib/events/contracts";

export default function EventsListPage() {
  const [events, setEvents] = useState<EventListItem[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/events");
    if (!res.ok) return;
    setEvents((await res.json()) as EventListItem[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main>
      <h1>Upcoming events</h1>
      <p>
        <Link href="/me">Back to account</Link>
      </p>
      <ul>
        {events.map((ev) => (
          <li key={ev.id}>
            <Link href={`/events/${ev.id}`}>{ev.name}</Link> — {ev.startsAt} ({ev.timezone}) @{" "}
            {ev.venueLabel}
            {ev.isSanctioned ? " · Sanctioned" : ""}
          </li>
        ))}
      </ul>
      {events.length === 0 ? <p>No published upcoming events.</p> : null}
    </main>
  );
}
