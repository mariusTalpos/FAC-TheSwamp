import { describe, expect, it } from "vitest";
import { canManageEvent } from "@/lib/events/permissions";

/** Cross-organizer denial matrix (US1 scenario 4) — logic-only integration check. */
describe("cross-organizer edit denial", () => {
  it("denies global organizer B managing organizer A event", () => {
    const eventA = { organizerUserId: "organizer-a" };
    expect(canManageEvent(eventA, "organizer-b", ["organizer"])).toBe(false);
  });

  it("allows organizer-as-participant paths via manage on own event only", () => {
    const own = { organizerUserId: "organizer-b" };
    expect(canManageEvent(own, "organizer-b", ["organizer", "marshal"])).toBe(true);
  });
});
