import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState, EntityList, EventListRow } from "@/components/ui";
import { auth } from "@/lib/auth/auth.config";
import { loadFighterEventsList } from "@/lib/ui/server-loaders/events";

export default async function EventsListPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const events = await loadFighterEventsList();

  return (
    <main>
      <h1>Upcoming events</h1>
      <p>
        <Link href="/me">Back to account</Link>
      </p>
      <EntityList
        items={events}
        keyExtractor={(ev) => ev.id}
        aria-label="Upcoming events"
        renderRow={(ev) => (
          <EventListRow event={ev} href={`/events/${ev.id}`} />
        )}
        empty={
          <EmptyState
            title="No published upcoming events."
            description="Check back when new events are published."
          />
        }
      />
    </main>
  );
}
