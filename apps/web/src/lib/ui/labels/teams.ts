export const membershipStatusLabels: Record<string, string> = {
  pending: "Pending",
  active: "Active",
  rejected: "Rejected",
  ended: "Ended",
};

export const affiliationStatusLabels: Record<string, string> = {
  unaffiliated: "Unaffiliated",
  pending: "Pending",
  active: "Active",
};

export const teamStatusLabels: Record<string, string> = {
  active: "Active",
  deactivated: "Deactivated",
};

export function membershipStatusLabel(status: string): string {
  return membershipStatusLabels[status] ?? status;
}

export function affiliationStatusLabel(status: string): string {
  return affiliationStatusLabels[status] ?? status;
}

export function teamStatusLabel(status: string): string {
  return teamStatusLabels[status] ?? status;
}
