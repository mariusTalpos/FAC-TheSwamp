import { describe, expect, it } from "vitest";
import {
  normalizeRingNameVisibility,
  validateRingNamePublicVisibility,
} from "@/lib/profile/fighter-profile-private";
import { deriveCompletionState } from "@/lib/profile/minimum-policy";
import { visibilityDelta } from "@/lib/profile/visibility";

describe("minimum-policy", () => {
  it("marks complete when displayName present", () => {
    expect(deriveCompletionState({ displayName: "Ada" })).toBe("complete");
    expect(deriveCompletionState({ displayName: "" })).toBe("incomplete");
  });
});

describe("ring name visibility", () => {
  it("rejects public ring name without a value", () => {
    expect(validateRingNamePublicVisibility(null, { ringName: { public: true } })).toMatch(
      /ring name/i,
    );
    expect(validateRingNamePublicVisibility("  ", { ringName: { public: true } })).toMatch(
      /ring name/i,
    );
    expect(validateRingNamePublicVisibility("The Ring", { ringName: { public: true } })).toBeNull();
  });

  it("forces ring name hidden when empty", () => {
    const vis = normalizeRingNameVisibility(null, { ringName: { public: true } });
    expect(vis.ringName?.public).toBe(false);
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
