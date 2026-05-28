import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth.config";
import { getEventById } from "@/lib/events/event-service";
import { OrganizerEventActions } from "@/app/(auth)/organizer/events/[eventId]/organizer-event-actions";

type Props = { params: Promise<{ eventId: string }> };

export default async function OrganizerEventDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { eventId } = await params;
  const event = await getEventById(eventId);
  if (!event) {
    notFound();
  }

  return (
    <main>
      <h1>{event.name}</h1>
      <p>
        <Link href="/organizer/events">All organizer events</Link> ·{" "}
        <Link href={`/organizer/events/${eventId}/registrations`}>Registrations</Link> ·{" "}
        <Link href={`/organizer/events/${eventId}/schedule`}>Schedule</Link>
      </p>
      <OrganizerEventActions eventId={eventId} initialEvent={event} />
    </main>
  );
}
