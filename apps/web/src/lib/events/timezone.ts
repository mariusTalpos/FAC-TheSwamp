import { DateTime } from "luxon";

export const DEFAULT_EVENT_TIMEZONE = "America/New_York";

/** Parse organizer/API datetime in the event's IANA timezone and return UTC instant. */
export function parseLocalDateTimeInZone(input: string, zone: string): Date {
  const dt = DateTime.fromISO(input, { zone });
  if (!dt.isValid) {
    throw new Error(`Invalid datetime for timezone ${zone}: ${input}`);
  }
  return dt.toUTC().toJSDate();
}

/** Format a UTC instant for display in the event timezone (includes zone abbreviation). */
export function formatInstantInZone(instant: Date, zone: string): string {
  return DateTime.fromJSDate(instant, { zone: "utc" }).setZone(zone).toFormat("yyyy-MM-dd HH:mm ZZZZ");
}

export function toIsoUtc(instant: Date): string {
  return DateTime.fromJSDate(instant, { zone: "utc" }).toISO() ?? instant.toISOString();
}
