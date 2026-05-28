import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth.config";
import { loadEventDetailForSession } from "@/lib/ui/server-loaders/events";
import { EventDetailActions } from "@/app/(auth)/events/[eventId]/event-detail-actions";

type Props = { params: Promise<{ eventId: string }> };

export default async function EventDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { eventId } = await params;
  const payload = await loadEventDetailForSession(eventId, session.user.id);
  if (!payload) {
    notFound();
  }

  const { event, registrations, schedule } = payload;
  const roleKeys = session.user.roleKeys ?? [];

  return (
    <main>
      <h1>{event.name}</h1>
      <p>
        <Link href="/events">All events</Link> · <Link href="/me">Account</Link>
      </p>
      <p>
        Starts: {event.startsAt} ({event.timezone}) · {event.venueLabel}
      </p>
      {event.description ? <p>{event.description}</p> : null}

      <EventDetailActions
        eventId={eventId}
        initialEvent={event}
        initialRegs={registrations}
        initialSchedule={schedule}
        roleKeys={roleKeys}
      />
    </main>
  );
}
