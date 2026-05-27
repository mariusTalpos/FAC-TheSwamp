import { describe, expect, it } from "vitest";
import {
  canCreateEvent,
  canManageEvent,
  canSanctionEvent,
  isRegistrationOpen,
} from "@/lib/events/permissions";

describe("events permissions", () => {
  it("allows fac_admin and organizer to create events", () => {
    expect(canCreateEvent(["fac_admin"])).toBe(true);
    expect(canCreateEvent(["organizer"])).toBe(true);
    expect(canCreateEvent(["fighter"])).toBe(false);
  });

  it("allows only owner or fac_admin to manage event", () => {
    const event = { organizerUserId: "org-1" };
    expect(canManageEvent(event, "org-1", ["organizer"])).toBe(true);
    expect(canManageEvent(event, "other", ["organizer"])).toBe(false);
    expect(canManageEvent(event, "other", ["fac_admin"])).toBe(true);
  });

  it("restricts sanction to fac_admin", () => {
    expect(canSanctionEvent(["fac_admin"])).toBe(true);
    expect(canSanctionEvent(["organizer"])).toBe(false);
  });

  it("checks registration window on published events", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const event = {
      lifecycleStatus: "published" as const,
      registrationOpensAt: new Date("2026-06-01T00:00:00Z"),
      registrationClosesAt: new Date("2026-06-02T00:00:00Z"),
      organizerUserId: "x",
      id: "e1",
      name: "t",
      timezone: "UTC",
      startsAt: now,
      endsAt: null,
      venueLabel: "v",
      isSanctioned: false,
      sanctioningNotes: null,
      fighterCapacity: null,
      staffCapacity: null,
      fighterConfirmationRequiredDaysBefore: null,
      createdByUserId: "x",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      cancelledAt: null,
      cancellationReason: null,
      description: null,
    };
    expect(isRegistrationOpen(event, now)).toBe(true);
    expect(isRegistrationOpen({ ...event, lifecycleStatus: "draft" }, now)).toBe(false);
  });
});
