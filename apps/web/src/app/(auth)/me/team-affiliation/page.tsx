"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState, ProblemAlert, StatusBadge, SuccessMessage } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/api/client";
import { useApiResource } from "@/hooks/use-api-resource";

type AffiliationSlot = {
  status: string;
  teamId?: string;
  teamName?: string;
  membershipId?: string;
};

type Summary = {
  fighter?: AffiliationSlot;
  squire?: AffiliationSlot;
};

type Team = { id: string; name: string };
type RosterMember = { userId: string; memberKind: string; applicantDisplayName?: string };

function AffiliationBlock({
  title,
  slot,
  applyKind,
  teams,
  onWithdraw,
  onApply,
}: {
  title: string;
  slot?: AffiliationSlot;
  applyKind: "fighter" | "squire";
  teams: Team[];
  onWithdraw: (membershipId: string) => Promise<void>;
  onApply: (teamId: string, memberKind: "fighter" | "squire") => Promise<void>;
}) {
  const [selectedTeam, setSelectedTeam] = useState("");

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    await onApply(selectedTeam, applyKind);
    setSelectedTeam("");
  }

  const status = slot?.status ?? "unaffiliated";

  return (
    <section aria-labelledby={`${applyKind}-aff-heading`}>
      <h2 id={`${applyKind}-aff-heading`}>{title}</h2>
      {status === "unaffiliated" ? (
        <EmptyState
          title="You are unaffiliated"
          description="Not on a team roster yet. Apply to one team at a time; a captain must approve before you appear on the active roster."
        />
      ) : status === "pending" ? (
        <>
          <p>
            Pending approval on <strong>{slot?.teamName}</strong> (
            <StatusBadge variant="application" status="pending" />
            ). You may only have one open application at a time.
          </p>
          {slot?.membershipId ? (
            <p>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Cancel your pending application to ${slot.teamName}? You can apply to another team after.`,
                    )
                  ) {
                    void onWithdraw(slot.membershipId!);
                  }
                }}
              >
                Cancel application
              </button>
            </p>
          ) : null}
        </>
      ) : (
        <p>
          Active member of <strong>{slot?.teamName}</strong>.
        </p>
      )}

      {status === "unaffiliated" ? (
        <div aria-labelledby={`${applyKind}-apply-heading`}>
          <h3 id={`${applyKind}-apply-heading`}>Apply to a team</h3>
          <form onSubmit={apply}>
            <p>
              <label htmlFor={`${applyKind}-apply-team`}>Team</label>
              <br />
              <select
                id={`${applyKind}-apply-team`}
                required
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                <option value="">Select team…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </p>
            <button type="submit">Submit application</button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

export default function TeamAffiliationPage() {
  const [message, setMessage] = useState<string | null>(null);

  const { data, error, runMutation } = useApiResource({
    resourceKey: "me-team-affiliation",
    loader: async () => {
      const [summary, teams] = await Promise.all([
        apiGet<Summary>("/api/me/team-affiliation"),
        apiGet<Team[]>("/api/teams"),
      ]);
      let roster: RosterMember[] = [];
      if (summary.fighter?.status === "active" && summary.fighter.teamId) {
        const rosterData = await apiGet<{ members: RosterMember[] }>(
          `/api/me/teams/${summary.fighter.teamId}/roster`,
        );
        roster = rosterData.members;
      }
      return { summary, teams, roster };
    },
  });

  const summary = data?.summary;
  const teams = data?.teams ?? [];
  const roster = data?.roster ?? [];

  async function applyToTeam(teamId: string, memberKind: "fighter" | "squire") {
    setMessage(null);
    const ok = await runMutation(() =>
      apiPost("/api/me/team-memberships/apply", { teamId, memberKind }),
    );
    if (ok !== null) setMessage("Application submitted.");
  }

  async function withdrawApplication(membershipId: string) {
    setMessage(null);
    const ok = await runMutation(() =>
      apiPost(`/api/me/team-memberships/${membershipId}/withdraw`),
    );
    if (ok !== null) setMessage("Application cancelled. You may apply to another team.");
  }

  const fighter = summary?.fighter;

  return (
    <main>
      <h1>Team affiliation</h1>
      <p>
        <Link href="/me">Back to account</Link>
      </p>

      <AffiliationBlock
        title="Fighter affiliation"
        slot={fighter}
        applyKind="fighter"
        teams={teams}
        onWithdraw={withdrawApplication}
        onApply={applyToTeam}
      />

      {summary?.squire ? (
        <AffiliationBlock
          title="Squire affiliation"
          slot={summary.squire}
          applyKind="squire"
          teams={teams}
          onWithdraw={withdrawApplication}
          onApply={applyToTeam}
        />
      ) : null}

      {error ? <ProblemAlert message={error} /> : null}
      {message ? <SuccessMessage message={message} /> : null}

      {fighter?.status === "active" && roster.length > 0 ? (
        <section aria-labelledby="peer-roster-heading">
          <h2 id="peer-roster-heading">Teammates on your roster</h2>
          <p>Approved active members (pending applicants are not listed).</p>
          <ul>
            {roster.map((m) => (
              <li key={m.userId}>
                {m.applicantDisplayName ?? m.userId} ({m.memberKind})
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
