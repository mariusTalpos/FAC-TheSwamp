import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  fighterProfiles,
  operationalRoles,
  roleAssignments,
  teamCaptainAssignments,
  teamMemberships,
  teams,
  users,
} from "@/lib/db/schema";
import { mapTeam } from "@/lib/teams/projections";
import type { TeamResponse } from "@/lib/teams/contracts";

export type TeamOverviewPerson = {
  userId: string;
  email: string;
  displayName: string | null;
};

export type TeamOverviewRoleGroup = {
  key: string;
  label: string;
  members: TeamOverviewPerson[];
};

export type TeamOverviewItem = {
  team: TeamResponse;
  roleGroups: TeamOverviewRoleGroup[];
};

const ROSTER_GROUP_DEFS: { key: string; label: string }[] = [
  { key: "captain", label: "Captains" },
  { key: "fighter", label: "Fighters (active roster)" },
  { key: "squire", label: "Squires (active roster)" },
  { key: "pending_fighter", label: "Pending fighters" },
  { key: "pending_squire", label: "Pending squires" },
];

const OPERATIONAL_ON_TEAM_DEFS: { key: string; label: string }[] = [
  { key: "marshal", label: "Marshals (affiliated)" },
  { key: "organizer", label: "Organizers (affiliated)" },
  { key: "fac_admin", label: "FAC admins (affiliated)" },
  { key: "squire_operational", label: "Squire role (operational, affiliated)" },
];

function personLabel(email: string, displayName: string | null | undefined): string {
  return displayName?.trim() || email;
}

function sortPeople(list: TeamOverviewPerson[]): TeamOverviewPerson[] {
  return [...list].sort((a, b) =>
    personLabel(a.email, a.displayName).localeCompare(personLabel(b.email, b.displayName)),
  );
}

function pushPerson(
  bucket: Map<string, TeamOverviewPerson>,
  userId: string,
  email: string,
  displayName: string | null | undefined,
) {
  if (!bucket.has(userId)) {
    bucket.set(userId, { userId, email, displayName: displayName?.trim() || null });
  }
}

export async function listTeamsAdminOverview(): Promise<TeamOverviewItem[]> {
  const teamRows = await db.select().from(teams).orderBy(asc(teams.name));
  if (teamRows.length === 0) return [];

  const teamIds = teamRows.map((t) => t.id);

  const captainRows = await db
    .select({
      teamId: teamCaptainAssignments.teamId,
      userId: teamCaptainAssignments.userId,
      email: users.email,
      displayName: fighterProfiles.displayName,
      userName: users.name,
    })
    .from(teamCaptainAssignments)
    .innerJoin(users, eq(users.id, teamCaptainAssignments.userId))
    .leftJoin(fighterProfiles, eq(fighterProfiles.userId, teamCaptainAssignments.userId))
    .where(
      and(
        inArray(teamCaptainAssignments.teamId, teamIds),
        isNull(teamCaptainAssignments.validTo),
      ),
    );

  const membershipRows = await db
    .select({
      teamId: teamMemberships.teamId,
      userId: teamMemberships.userId,
      memberKind: teamMemberships.memberKind,
      status: teamMemberships.status,
      email: users.email,
      displayName: fighterProfiles.displayName,
      userName: users.name,
    })
    .from(teamMemberships)
    .innerJoin(users, eq(users.id, teamMemberships.userId))
    .leftJoin(fighterProfiles, eq(fighterProfiles.userId, teamMemberships.userId))
    .where(
      and(
        inArray(teamMemberships.teamId, teamIds),
        inArray(teamMemberships.status, ["active", "pending"]),
      ),
    );

  const roleRows = await db
    .select({
      userId: roleAssignments.userId,
      roleKey: operationalRoles.key,
      email: users.email,
      displayName: fighterProfiles.displayName,
      userName: users.name,
    })
    .from(roleAssignments)
    .innerJoin(operationalRoles, eq(operationalRoles.id, roleAssignments.operationalRoleId))
    .innerJoin(users, eq(users.id, roleAssignments.userId))
    .leftJoin(fighterProfiles, eq(fighterProfiles.userId, roleAssignments.userId))
    .where(isNull(roleAssignments.validTo));

  const captainsByTeam = new Map<string, Map<string, TeamOverviewPerson>>();
  const groupsByTeam = new Map<string, Map<string, Map<string, TeamOverviewPerson>>>();
  const affiliatedByTeam = new Map<string, Set<string>>();

  for (const teamId of teamIds) {
    groupsByTeam.set(teamId, new Map());
    affiliatedByTeam.set(teamId, new Set());
    captainsByTeam.set(teamId, new Map());
  }

  for (const row of captainRows) {
    const displayName = row.displayName ?? row.userName;
    pushPerson(captainsByTeam.get(row.teamId)!, row.userId, row.email, displayName);
    affiliatedByTeam.get(row.teamId)!.add(row.userId);
  }

  for (const row of membershipRows) {
    const displayName = row.displayName ?? row.userName;
    affiliatedByTeam.get(row.teamId)!.add(row.userId);

    let groupKey: string;
    if (row.status === "active") {
      groupKey = row.memberKind;
    } else {
      groupKey = row.memberKind === "fighter" ? "pending_fighter" : "pending_squire";
    }

    const teamGroups = groupsByTeam.get(row.teamId)!;
    if (!teamGroups.has(groupKey)) teamGroups.set(groupKey, new Map());
    pushPerson(teamGroups.get(groupKey)!, row.userId, row.email, displayName);
  }

  const rolesByUser = new Map<string, Set<string>>();
  const userDirectory = new Map<string, TeamOverviewPerson>();
  for (const row of roleRows) {
    if (!rolesByUser.has(row.userId)) rolesByUser.set(row.userId, new Set());
    rolesByUser.get(row.userId)!.add(row.roleKey);
    if (!userDirectory.has(row.userId)) {
      userDirectory.set(row.userId, {
        userId: row.userId,
        email: row.email,
        displayName: (row.displayName ?? row.userName)?.trim() || null,
      });
    }
  }

  return teamRows.map((teamRow) => {
    const teamId = teamRow.id;
    const teamGroups = groupsByTeam.get(teamId)!;
    const affiliated = affiliatedByTeam.get(teamId)!;
    const roleGroups: TeamOverviewRoleGroup[] = [];

    for (const def of ROSTER_GROUP_DEFS) {
      let members: TeamOverviewPerson[] = [];
      if (def.key === "captain") {
        members = sortPeople([...captainsByTeam.get(teamId)!.values()]);
      } else {
        const bucket = teamGroups.get(def.key);
        members = bucket ? sortPeople([...bucket.values()]) : [];
      }
      roleGroups.push({ key: def.key, label: def.label, members });
    }

    for (const def of OPERATIONAL_ON_TEAM_DEFS) {
      const roleKey = def.key === "squire_operational" ? "squire" : def.key;
      const members: TeamOverviewPerson[] = [];
      for (const userId of affiliated) {
        const keys = rolesByUser.get(userId);
        if (!keys?.has(roleKey)) continue;
        const fromCaptain = captainsByTeam.get(teamId)?.get(userId);
        const fromRoster = [...teamGroups.values()]
          .map((m) => m.get(userId))
          .find(Boolean);
        const person = fromCaptain ?? fromRoster ?? userDirectory.get(userId);
        if (person) members.push(person);
      }
      roleGroups.push({ key: def.key, label: def.label, members: sortPeople(members) });
    }

    return { team: mapTeam(teamRow), roleGroups };
  });
}
