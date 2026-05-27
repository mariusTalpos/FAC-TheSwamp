"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type {
  EventScheduleResponse,
  ScheduleChangeRecordResponse,
  ScheduleEntryResponse,
} from "@/lib/events/contracts";

export default function OrganizerSchedulePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [board, setBoard] = useState<EventScheduleResponse | null>(null);
  const [changes, setChanges] = useState<ScheduleChangeRecordResponse[]>([]);
  const [label, setLabel] = useState("");
  const [startAt, setStartAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [bRes, cRes] = await Promise.all([
      fetch(`/api/events/${eventId}/schedule`),
      fetch(`/api/events/${eventId}/schedule/changes`),
    ]);
    if (bRes.ok) setBoard((await bRes.json()) as EventScheduleResponse);
    if (cRes.ok) setChanges((await cRes.json()) as ScheduleChangeRecordResponse[]);
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/events/${eventId}/schedule/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        scheduledStartAt: new Date(startAt).toISOString(),
        acknowledgeScheduleWarnings: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Create failed");
      return;
    }
    setLabel("");
    setStartAt("");
    await load();
  }

  return (
    <main>
      <h1>Schedule board</h1>
      <p>
        <Link href={`/organizer/events/${eventId}`}>Event detail</Link> · Timezone:{" "}
        {board?.timezone}
      </p>
      {error ? <p role="alert">{error}</p> : null}

      <form onSubmit={addEntry} aria-labelledby="add-entry-heading">
        <h2 id="add-entry-heading">Add entry</h2>
        <p>
          <label htmlFor="entry-label">Label</label>
          <br />
          <input id="entry-label" required value={label} onChange={(e) => setLabel(e.target.value)} />
        </p>
        <p>
          <label htmlFor="entry-start">Start (local)</label>
          <br />
          <input
            id="entry-start"
            type="datetime-local"
            required
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
        </p>
        <button type="submit">Add entry</button>
      </form>

      <section aria-labelledby="board-heading">
        <h2 id="board-heading">Entries</h2>
        <ol>
          {(board?.entries ?? []).map((entry: ScheduleEntryResponse) => (
            <li key={entry.id}>
              {entry.label} — {entry.scheduledStartAt} ({board?.timezone}) · status:{" "}
              <span>{entry.status}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="history-heading">
        <h2 id="history-heading">Change history</h2>
        <ol>
          {changes.map((c) => (
            <li key={c.id}>
              {c.fieldName}: {c.priorValue ?? "—"} → {c.newValue ?? "—"} by {c.actorUserId} at{" "}
              {c.createdAt}
              {c.reason ? ` (${c.reason})` : ""}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
