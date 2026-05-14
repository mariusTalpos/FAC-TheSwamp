import { describe, expect, it } from "vitest";
import { deriveCompletionState } from "@/lib/profile/minimum-policy";
import { visibilityDelta } from "@/lib/profile/visibility";

describe("minimum-policy", () => {
  it("marks complete when displayName present", () => {
    expect(deriveCompletionState({ displayName: "Ada" })).toBe("complete");
    expect(deriveCompletionState({ displayName: "" })).toBe("incomplete");
  });
});

describe("visibility", () => {
  it("detects visibility deltas", () => {
    const before = { ringName: { public: true } };
    const after = { ringName: { public: false } };
    const d = visibilityDelta(before, after);
    expect(d.ringName).toBeDefined();
  });
});
