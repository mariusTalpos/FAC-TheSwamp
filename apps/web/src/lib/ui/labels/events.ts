export const eventLifecycleLabels: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  registration_closed: "Registration closed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const registrationStatusLabels: Record<string, string> = {
  submitted: "Submitted",
  confirmed: "Confirmed",
  waitlisted: "Waitlisted",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
};

export const scheduleEntryStatusLabels: Record<string, string> = {
  planned: "Planned",
  delayed: "Delayed",
  cancelled: "Cancelled",
};

export function eventLifecycleLabel(status: string): string {
  return eventLifecycleLabels[status] ?? status;
}

export function registrationStatusLabel(status: string): string {
  return registrationStatusLabels[status] ?? status;
}

export function scheduleEntryStatusLabel(status: string): string {
  return scheduleEntryStatusLabels[status] ?? status;
}
