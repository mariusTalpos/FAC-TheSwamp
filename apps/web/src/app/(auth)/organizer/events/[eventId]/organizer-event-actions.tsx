"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProblemAlert, StatusBadge } from "@/components/ui";
import { apiErrorMessage, apiPost } from "@/lib/api/client";
import type { EventResponse } from "@/lib/events/contracts";

type Props = {
  eventId: string;
  initialEvent: EventResponse;
};

export function OrganizerEventActions({ eventId, initialEvent }: Props) {
  const router = useRouter();
  const [event, setEvent] = useState(initialEvent);
  const [error, setError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  async function action(path: string, body?: object) {
    setError(null);
    try {
      const updated = await apiPost<EventResponse>(`/api/events/${eventId}/${path}`, body);
      setEvent(updated);
      router.refresh();
    } catch (err) {
      setError(apiErrorMessage(err, "Action failed"));
    }
  }

  return (
    <>
      <p>
        Status: <StatusBadge variant="event-lifecycle" status={event.lifecycleStatus} /> · Timezone:{" "}
        {event.timezone} · Starts: {event.startsAt}
      </p>
      <p>Venue: {event.venueLabel}</p>
      {event.description ? <p>{event.description}</p> : null}
      {error ? <ProblemAlert message={error} onDismiss={() => setError(null)} /> : null}

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
    </>
  );
}
