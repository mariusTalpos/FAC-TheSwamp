/** Operational role keys allowed for event staff self-registration (E3). */
export const EVENT_STAFF_REGISTRATION_ROLE_KEYS = ["marshal"] as const;

export type EventStaffRegistrationRoleKey = (typeof EVENT_STAFF_REGISTRATION_ROLE_KEYS)[number];

const STAFF_ROLE_SET = new Set<string>(EVENT_STAFF_REGISTRATION_ROLE_KEYS);

/** Role keys the user holds that they may register under as event staff. */
export function staffRegistrationRoleOptions(userRoleKeys: string[]): string[] {
  return userRoleKeys.filter((key) => STAFF_ROLE_SET.has(key));
}

export function staffRegistrationRoleLabel(key: string): string {
  switch (key) {
    case "marshal":
      return "Marshal";
    default:
      return key;
  }
}
