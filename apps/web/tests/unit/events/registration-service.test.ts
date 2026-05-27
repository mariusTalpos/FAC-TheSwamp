import { describe, expect, it } from "vitest";
import { fifoWaitlistPromotionPolicy } from "@/lib/events/registration-service";

describe("registration-service policy", () => {
  it("exports FIFO waitlist promotion policy", () => {
    expect(typeof fifoWaitlistPromotionPolicy.promoteNext).toBe("function");
  });
});
