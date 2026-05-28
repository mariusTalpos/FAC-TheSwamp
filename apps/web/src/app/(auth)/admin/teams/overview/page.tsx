"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState, ProblemAlert } from "@/components/ui";
import { apiGet } from "@/lib/api/client";
import { useApiResource } from "@/hooks/use-api-resource";

type OverviewPerson = {
  userId: string;
  email: string;
  displayName: string | null;
};

type RoleGroup = {
  key: string;
  label: string;
  members: OverviewPerson[];
};

type TeamOverview = {
  team: {
    id: string;
    name: string;
    status: string;
    region?: string | null;
  };
  roleGroups: RoleGroup[];
};

function personLabel(p: OverviewPerson): string {
  return p.displayName?.trim() || p.email;
}

function MemberTable({ group }: { group: RoleGroup }) {
  return (
    <table className="overview-table overview-table--members">
      <caption className="sr-only">{group.label} members</caption>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Email</th>
          <th scope="col">User id</th>
        </tr>
      </thead>
      <tbody>
        {group.members.map((m) => (
          <tr key={m.userId}>
            <td>{personLabel(m)}</td>
            <td>{m.email}</td>
            <td>
              <code>{m.userId}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RoleGroupsPanel({ groups }: { groups: RoleGroup[] }) {
  const hasAnyone = groups.some((g) => g.members.length > 0);
  if (!hasAnyone) {
    return (
      <p className="overview-muted">No captains, roster members, or affiliated roles for this team.</p>
    );
  }

  return (
    <ul className="overview-role-list">
      {groups.map((group) => (
        <li key={group.key}>
          {group.members.length === 0 ? (
            <div className="overview-role-row overview-role-row--empty">
              <span className="overview-role-label">{group.label}</span>
              <span className="overview-count"> — None</span>
            </div>
          ) : (
            <details className="overview-details overview-details--role overview-role-row">
              <summary>
                <span className="overview-role-label">{group.label}</span>
                <span className="overview-count">
                  ({group.members.length} {group.members.length === 1 ? "person" : "people"})
                </span>
              </summary>
              <div className="overview-role-body">
                <MemberTable group={group} />
              </div>
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function AdminTeamsOverviewPage() {
  const { data, error, loading } = useApiResource({
    resourceKey: "admin-teams-overview",
    loader: () => apiGet<{ teams: TeamOverview[] }>("/api/admin/teams/overview"),
  });

  const teams = data?.teams ?? [];

  return (
    <main className="wide overview-surface">
      <h1>Teams overview</h1>
      <p className="overview-muted">
        FAC admin only. Expand a team to see role groups; expand a role to see members.
      </p>
      <p>
        <Link href="/admin/teams">Manage teams</Link> · <Link href="/me">Account</Link>
      </p>

      {error ? (
        <ProblemAlert message={error} />
      ) : null}

      {loading ? (
        <p role="status">Loading teams…</p>
      ) : teams.length === 0 ? (
        <EmptyState title="No teams yet." />
      ) : (
        <table className="overview-table overview-table--teams">
          <caption className="sr-only">Teams with expandable role breakdown</caption>
          <thead>
            <tr>
              <th scope="col">Team</th>
              <th scope="col">Region</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((row) => (
              <TeamRows key={row.team.id} row={row} />
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

function TeamRows({ row }: { row: TeamOverview }) {
  const [expanded, setExpanded] = useState(false);
  const totalPeople = new Set(row.roleGroups.flatMap((g) => g.members.map((m) => m.userId))).size;

  return (
    <>
      <tr className="overview-team-row">
        <td>
          <button
            type="button"
            className="overview-expand"
            aria-expanded={expanded}
            aria-controls={`team-roles-${row.team.id}`}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "▾" : "▸"}
          </button>{" "}
          <strong>{row.team.name}</strong>{" "}
          <span className="overview-muted">({totalPeople} affiliated)</span>{" "}
          <Link href={`/admin/teams/${row.team.id}`}>Manage</Link>
        </td>
        <td>{row.team.region ?? "—"}</td>
        <td>{row.team.status}</td>
      </tr>
      {expanded ? (
        <tr className="overview-team-detail-row">
          <td colSpan={3} id={`team-roles-${row.team.id}`}>
            <RoleGroupsPanel groups={row.roleGroups} />
          </td>
        </tr>
      ) : null}
    </>
  );
}
