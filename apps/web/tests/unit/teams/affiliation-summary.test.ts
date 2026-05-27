import { describe, expect, it } from "vitest";

/** Documents affiliation resolution priority (active before pending). */
describe("affiliation slot priority", () => {
  it("prefers active membership over a newer pending row", () => {
    const rows = [
      { status: "pending" as const, updatedAt: 100 },
      { status: "active" as const, updatedAt: 50 },
    ];
    const active = rows.find((r) => r.status === "active");
    const pending = rows.find((r) => r.status === "pending");
    expect(active).toBeTruthy();
    expect(pending).toBeTruthy();
    const slotStatus = active ? "active" : pending ? "pending" : "unaffiliated";
    expect(slotStatus).toBe("active");
  });
});
