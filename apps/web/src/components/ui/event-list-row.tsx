import Link from "next/link";
import type { EventListItem, EventResponse } from "@/lib/events/contracts";
import { StatusBadge } from "@/components/ui/status-badge";

export type EventListRowProps = {
  event: EventListItem | EventResponse;
  href: string;
  showOrganizerMeta?: boolean;
};

export function EventListRow({ event, href, showOrganizerMeta }: EventListRowProps) {
  return (
    <>
      <Link href={href}>{event.name}</Link>
      {" — "}
      {event.startsAt} ({event.timezone}) @ {event.venueLabel}
      {showOrganizerMeta ? (
        <>
          {" "}
          <StatusBadge variant="event-lifecycle" status={event.lifecycleStatus} />
        </>
      ) : null}
      {event.isSanctioned ? " · Sanctioned" : ""}
    </>
  );
}
