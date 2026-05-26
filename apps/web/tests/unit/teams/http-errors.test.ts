import { describe, expect, it } from "vitest";
import { captainAssignErrorResponse } from "@/lib/teams/http-errors";

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
