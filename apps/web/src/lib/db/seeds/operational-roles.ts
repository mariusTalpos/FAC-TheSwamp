export type OperationalRoleSeed = {
  key: string;
  displayName: string;
  isPrivileged: boolean;
};

/** FAC-controlled operational role keys (see data-model.md). */
export const OPERATIONAL_ROLE_SEEDS: OperationalRoleSeed[] = [
  { key: "fac_admin", displayName: "FAC Administrator", isPrivileged: true },
  { key: "marshal", displayName: "Marshal", isPrivileged: false },
  { key: "organizer", displayName: "Organizer", isPrivileged: false },
  { key: "squire", displayName: "Squire", isPrivileged: false },
];
