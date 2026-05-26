import { describe, expect, it } from "vitest";
import { canDecideMembership } from "@/lib/teams/permission-matrix";

describe("teams permission matrix", () => {
  it("marshal/FAC admin bypass documented via fac_admin flag", () => {
    expect(
      canDecideMembership({
        isFacAdmin: true,
        isCaptainOfTeam: false,
        applicantIsCaptain: false,
        actorUserId: "admin",
        applicantUserId: "fighter",
      }).allowed,
    ).toBe(true);
  });

  it("cross-team captain cannot approve without captain scope", () => {
    expect(
      canDecideMembership({
        isFacAdmin: false,
        isCaptainOfTeam: false,
        applicantIsCaptain: false,
        actorUserId: "captain-a",
        applicantUserId: "fighter-b",
      }).allowed,
    ).toBe(false);
  });
});
