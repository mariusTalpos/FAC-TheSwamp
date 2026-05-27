import { describe, expect, it } from "vitest";
import { formatInstantInZone, parseLocalDateTimeInZone } from "@/lib/events/timezone";

describe("event timezone helpers", () => {
  it("parses local datetime in event zone to UTC", () => {
    const utc = parseLocalDateTimeInZone("2026-07-04T10:00:00", "America/New_York");
    expect(utc.toISOString()).toMatch(/2026-07-04T14:00:00/);
  });

  it("formats UTC instant in event zone with zone text", () => {
    const text = formatInstantInZone(
      new Date("2026-07-04T14:00:00.000Z"),
      "America/New_York",
    );
    expect(text).toContain("2026-07-04");
    expect(text.toLowerCase()).toMatch(/edt|est/);
  });
});
