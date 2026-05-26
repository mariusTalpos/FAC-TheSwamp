import { describe, expect, it } from "vitest";
import { canDecideMembership } from "@/lib/teams/permission-matrix";

describe("canDecideMembership", () => {
  it("blocks self-approval for captain", () => {
    const r = canDecideMembership({
      isFacAdmin: false,
      isCaptainOfTeam: true,
      applicantIsCaptain: false,
      actorUserId: "u1",
      applicantUserId: "u1",
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("self_approval");
  });

  it("allows FAC admin to decide captain self-application", () => {
    const r = canDecideMembership({
      isFacAdmin: true,
      isCaptainOfTeam: false,
      applicantIsCaptain: true,
      actorUserId: "admin",
      applicantUserId: "captain",
    });
    expect(r.allowed).toBe(true);
  });

  it("denies non-captain non-admin", () => {
    const r = canDecideMembership({
      isFacAdmin: false,
      isCaptainOfTeam: false,
      applicantIsCaptain: false,
      actorUserId: "x",
      applicantUserId: "y",
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("not_captain");
  });
});

