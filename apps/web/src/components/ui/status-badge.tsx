import {
  eventLifecycleLabel,
  registrationStatusLabel,
  scheduleEntryStatusLabel,
} from "@/lib/ui/labels/events";
import {
  affiliationStatusLabel,
  membershipStatusLabel,
  teamStatusLabel,
} from "@/lib/ui/labels/teams";

export type StatusVariant =
  | "event-lifecycle"
  | "registration"
  | "schedule"
  | "membership"
  | "application"
  | "team"
  | "neutral";

export type StatusBadgeProps = {
  variant: StatusVariant;
  status: string;
  label?: string;
};

function resolveLabel(variant: StatusVariant, status: string): string {
  switch (variant) {
    case "event-lifecycle":
      return eventLifecycleLabel(status);
    case "registration":
      return registrationStatusLabel(status);
    case "schedule":
      return scheduleEntryStatusLabel(status);
    case "membership":
      return membershipStatusLabel(status);
    case "application":
      return affiliationStatusLabel(status);
    case "team":
      return teamStatusLabel(status);
    default:
      return status;
  }
}

export function StatusBadge({ variant, status, label }: StatusBadgeProps) {
  const text = label ?? resolveLabel(variant, status);
  return (
    <span aria-label={`Status: ${text}`}>
      [{text}]
    </span>
  );
}
