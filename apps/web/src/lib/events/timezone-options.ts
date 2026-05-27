import { DEFAULT_EVENT_TIMEZONE } from "@/lib/events/timezone";

export type TimezoneOption = {
  value: string;
  label: string;
};

/** Curated IANA zones for event scheduling (FAC-default Eastern first). */
export const EVENT_TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: "America/New_York", label: "Eastern — America/New_York" },
  { value: "America/Chicago", label: "Central — America/Chicago" },
  { value: "America/Denver", label: "Mountain — America/Denver" },
  { value: "America/Los_Angeles", label: "Pacific — America/Los_Angeles" },
  { value: "America/Phoenix", label: "Arizona — America/Phoenix" },
  { value: "America/Anchorage", label: "Alaska — America/Anchorage" },
  { value: "Pacific/Honolulu", label: "Hawaii — Pacific/Honolulu" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "UK — Europe/London" },
  { value: "Europe/Paris", label: "Central Europe — Europe/Paris" },
  { value: "Europe/Berlin", label: "Europe — Europe/Berlin" },
  { value: "Australia/Sydney", label: "Australia — Australia/Sydney" },
];

export { DEFAULT_EVENT_TIMEZONE };
