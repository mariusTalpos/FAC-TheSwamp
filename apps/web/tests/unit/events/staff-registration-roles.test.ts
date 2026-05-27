import { describe, expect, it } from "vitest";
import { staffRegistrationRoleOptions } from "@/lib/events/staff-registration-roles";

describe("staffRegistrationRoleOptions", () => {
  it("returns only staff-eligible roles the user holds", () => {
    expect(staffRegistrationRoleOptions(["marshal", "organizer"])).toEqual(["marshal"]);
    expect(staffRegistrationRoleOptions(["fighter", "fac_admin"])).toEqual([]);
  });
});
