import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventRow } from "@/lib/events/event-service";
import { mapPublicEvent } from "@/lib/events/projections";
import { formatInstantInZone } from "@/lib/events/timezone";
import { isPublicEventsEnabled } from "@/lib/events/public-flag";

type Props = { params: Promise<{ eventId: string }> };

export default async function PublicEventPage({ params }: Props) {
  if (!isPublicEventsEnabled()) notFound();

  const { eventId } = await params;
  const row = await getEventRow(eventId);
  if (!row || row.lifecycleStatus !== "published") notFound();

  const event = mapPublicEvent(row);
  const displayStart = formatInstantInZone(new Date(event.startsAt), event.timezone);

  return (
    <main>
      <h1>{event.name}</h1>
      <p>
        {displayStart} · {event.venueLabel}
      </p>
      <p>
        <Link href="/">Home</Link>
      </p>
    </main>
  );
}
