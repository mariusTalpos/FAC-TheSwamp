import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/events/event-service", () => ({
  listPublishedUpcomingEvents: vi.fn(),
  listOrganizerEvents: vi.fn(),
  getEventById: vi.fn(),
}));

vi.mock("@/lib/events/registration-service", () => ({
  getMyRegistrations: vi.fn(),
}));

vi.mock("@/lib/events/schedule-service", () => ({
  listBoard: vi.fn(),
}));

import {
  getEventById,
  listOrganizerEvents,
  listPublishedUpcomingEvents,
} from "@/lib/events/event-service";
import { getMyRegistrations } from "@/lib/events/registration-service";
import { listBoard } from "@/lib/events/schedule-service";
import {
  loadEventDetailForSession,
  loadFighterEventsList,
  loadOrganizerEventsList,
} from "@/lib/ui/server-loaders/events";

describe("events server loaders", () => {
  it("loadFighterEventsList returns list items from service", async () => {
    const items = [
      {
        id: "e1",
        name: "Open Mat",
        startsAt: "2026-06-01T12:00:00Z",
        venueLabel: "Hall",
        timezone: "America/New_York",
        lifecycleStatus: "published" as const,
        isSanctioned: false,
      },
    ];
    vi.mocked(listPublishedUpcomingEvents).mockResolvedValue(items);
    await expect(loadFighterEventsList()).resolves.toEqual(items);
  });

  it("loadOrganizerEventsList delegates to listOrganizerEvents", async () => {
    vi.mocked(listOrganizerEvents).mockResolvedValue([]);
    await loadOrganizerEventsList("user-1", false);
    expect(listOrganizerEvents).toHaveBeenCalledWith("user-1", false);
  });

  it("loadEventDetailForSession returns null when event missing", async () => {
    vi.mocked(getEventById).mockResolvedValue(null);
    await expect(loadEventDetailForSession("e1", "u1")).resolves.toBeNull();
  });

  it("loadEventDetailForSession bundles event, registrations, schedule", async () => {
    const event = {
      id: "e1",
      name: "Tournament",
      timezone: "UTC",
      startsAt: "2026-06-01T12:00:00Z",
      venueLabel: "Arena",
      lifecycleStatus: "published" as const,
      isSanctioned: false,
      organizerUserId: "org-1",
    };
    const registrations = { staff: [] };
    const schedule = { timezone: "UTC", schedulePublished: true, entries: [] };
    vi.mocked(getEventById).mockResolvedValue(event);
    vi.mocked(getMyRegistrations).mockResolvedValue(registrations);
    vi.mocked(listBoard).mockResolvedValue(schedule);

    await expect(loadEventDetailForSession("e1", "u1")).resolves.toEqual({
      event,
      registrations,
      schedule,
    });
  });
});
