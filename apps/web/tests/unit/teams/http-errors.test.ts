import { describe, expect, it } from "vitest";
import {
  captainAssignErrorResponse,
  membershipErrorResponse,
} from "@/lib/teams/http-errors";

describe("captainAssignErrorResponse", () => {
  it("maps already_captain to 409 conflict", () => {
    const res = captainAssignErrorResponse("already_captain");
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("conflict");
    expect(res.body.message).toContain("already an active captain");
  });

  it("maps not_found to 404", () => {
    const res = captainAssignErrorResponse("not_found");
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("not_found");
  });
});

describe("membershipErrorResponse", () => {
  it("maps fighter_profile_required to 403", () => {
    const res = membershipErrorResponse("fighter_profile_required");
    expect(res.status).toBe(403);
    expect(res.body.message).toContain("fighter profile");
  });
});
