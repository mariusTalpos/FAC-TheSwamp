import {
  getEventById,
  listOrganizerEvents,
  listPublishedUpcomingEvents,
} from "@/lib/events/event-service";
import type {
  EventListItem,
  EventResponse,
  EventScheduleResponse,
  MyEventRegistrationsResponse,
} from "@/lib/events/contracts";
import { getMyRegistrations } from "@/lib/events/registration-service";
import { listBoard } from "@/lib/events/schedule-service";

export async function loadFighterEventsList(): Promise<EventListItem[]> {
  return listPublishedUpcomingEvents();
}

export async function loadOrganizerEventsList(
  userId: string,
  isAdmin: boolean,
): Promise<EventResponse[]> {
  return listOrganizerEvents(userId, isAdmin);
}

export type EventDetailSessionPayload = {
  event: EventResponse;
  registrations: MyEventRegistrationsResponse;
  schedule: EventScheduleResponse | null;
};

export async function loadEventDetailForSession(
  eventId: string,
  userId: string,
): Promise<EventDetailSessionPayload | null> {
  const event = await getEventById(eventId);
  if (!event) return null;

  const [registrations, schedule] = await Promise.all([
    getMyRegistrations(eventId, userId),
    listBoard(eventId),
  ]);

  return { event, registrations, schedule };
}
