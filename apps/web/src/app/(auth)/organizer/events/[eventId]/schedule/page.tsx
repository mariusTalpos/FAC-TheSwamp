"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProblemAlert, StatusBadge, SuccessMessage } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/api/client";
import type {
  EventScheduleResponse,
  ScheduleChangeRecordResponse,
  ScheduleEntryResponse,
} from "@/lib/events/contracts";
import { useApiResource } from "@/hooks/use-api-resource";

export default function OrganizerSchedulePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [label, setLabel] = useState("");
  const [startAt, setStartAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const { data, error, runMutation } = useApiResource({
    resourceKey: `organizer-schedule-${eventId}`,
    loader: async () => {
      const [board, changes] = await Promise.all([
        apiGet<EventScheduleResponse>(`/api/events/${eventId}/schedule`),
        apiGet<ScheduleChangeRecordResponse[]>(`/api/events/${eventId}/schedule/changes`),
      ]);
      return { board, changes };
    },
  });

  const board = data?.board ?? null;
  const changes = data?.changes ?? [];

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const result = await runMutation(() =>
      apiPost(`/api/events/${eventId}/schedule/entries`, {
        label,
        scheduledStartAt: new Date(startAt).toISOString(),
        acknowledgeScheduleWarnings: true,
      }),
    );
    if (result !== null) {
      setLabel("");
      setStartAt("");
      setMessage("Schedule entry added");
    }
  }

  return (
    <main>
      <h1>Schedule board</h1>
      <p>
        <Link href={`/organizer/events/${eventId}`}>Event detail</Link> · Timezone:{" "}
        {board?.timezone}
      </p>
      {error ? <ProblemAlert message={error} /> : null}
      {message ? <SuccessMessage message={message} /> : null}

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
              {entry.label} — {entry.scheduledStartAt} ({board?.timezone}) ·{" "}
              <StatusBadge variant="schedule" status={entry.status} />
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
