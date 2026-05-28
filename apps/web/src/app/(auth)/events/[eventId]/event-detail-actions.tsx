"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProblemAlert, StatusBadge, SuccessMessage } from "@/components/ui";
import { apiErrorMessage, apiGet, apiPost } from "@/lib/api/client";
import type {
  EventResponse,
  EventScheduleResponse,
  MyEventRegistrationsResponse,
} from "@/lib/events/contracts";
import {
  staffRegistrationRoleLabel,
  staffRegistrationRoleOptions,
} from "@/lib/events/staff-registration-roles";

type Props = {
  eventId: string;
  initialEvent: EventResponse;
  initialRegs: MyEventRegistrationsResponse;
  initialSchedule: EventScheduleResponse | null;
  roleKeys: string[];
};

export function EventDetailActions({
  eventId,
  initialEvent,
  initialRegs,
  initialSchedule,
  roleKeys,
}: Props) {
  const router = useRouter();
  const [event] = useState(initialEvent);
  const [regs, setRegs] = useState(initialRegs);
  const [schedule] = useState(initialSchedule);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const staffRoleOptions = staffRegistrationRoleOptions(roleKeys);
  const [staffRole, setStaffRole] = useState(staffRoleOptions[0] ?? "");

  async function refreshRegs() {
    try {
      const next = await apiGet<MyEventRegistrationsResponse>(
        `/api/events/${eventId}/registrations/me`,
      );
      setRegs(next);
    } catch {
      /* keep prior regs on refresh failure */
    }
    router.refresh();
  }

  async function runMutation(fn: () => Promise<void>, successMessage: string) {
    setError(null);
    setMessage(null);
    try {
      await fn();
      setMessage(successMessage);
      await refreshRegs();
    } catch (err) {
      setError(apiErrorMessage(err, "Action failed"));
    }
  }

  const fighter = regs?.fighter;
  const needsConfirm =
    event.fighterConfirmationRequiredDaysBefore != null && fighter?.status === "submitted";

  return (
    <>
      {error ? <ProblemAlert message={error} onDismiss={() => setError(null)} /> : null}
      {message ? <SuccessMessage message={message} /> : null}

      <p>
        Status: <StatusBadge variant="event-lifecycle" status={event.lifecycleStatus} />
      </p>

      <section aria-labelledby="fighter-reg-heading">
        <h2 id="fighter-reg-heading">Fighter registration</h2>
        {fighter ? (
          <>
            <p>
              Status: <StatusBadge variant="registration" status={fighter.status} />
              {fighter.teamNameSnapshot
                ? ` · Team (informational): ${fighter.teamNameSnapshot}`
                : " · Unaffiliated"}
            </p>
            {needsConfirm ? (
              <button
                type="button"
                onClick={() =>
                  void runMutation(
                    () => apiPost(`/api/events/${eventId}/registrations/fighter/confirm`),
                    "Attendance confirmed",
                  )
                }
              >
                Confirm attendance
              </button>
            ) : null}
            {["submitted", "confirmed", "waitlisted"].includes(fighter.status) ? (
              <button
                type="button"
                onClick={() =>
                  void runMutation(
                    () => apiPost(`/api/events/${eventId}/registrations/fighter/withdraw`),
                    "Fighter registration withdrawn",
                  )
                }
              >
                Withdraw fighter registration
              </button>
            ) : null}
          </>
        ) : (
          <button
            type="button"
            onClick={() =>
              void runMutation(async () => {
                const data = await apiPost<{ status: string }>(
                  `/api/events/${eventId}/registrations/fighter`,
                );
                setMessage(`Fighter registration: ${data.status}`);
              }, "Fighter registration submitted")
            }
          >
            Register as fighter
          </button>
        )}
      </section>

      {staffRoleOptions.length > 0 ? (
        <section aria-labelledby="staff-reg-heading">
          <h2 id="staff-reg-heading">Staff registration</h2>
          <p>
            <label htmlFor="staff-role">Staff role</label>
            <br />
            <select
              id="staff-role"
              value={staffRole}
              onChange={(e) => setStaffRole(e.target.value)}
            >
              {staffRoleOptions.map((key) => (
                <option key={key} value={key}>
                  {staffRegistrationRoleLabel(key)}
                </option>
              ))}
            </select>
          </p>
          <button
            type="button"
            disabled={!staffRole}
            onClick={() =>
              void runMutation(async () => {
                const data = await apiPost<{ status: string }>(
                  `/api/events/${eventId}/registrations/staff`,
                  { operationalRoleKey: staffRole },
                );
                setMessage(`Staff registration (${staffRole}): ${data.status}`);
              }, "")
            }
          >
            Register as staff
          </button>
          {regs?.staff?.length ? (
            <ul>
              {regs.staff.map((s) => (
                <li key={s.id}>
                  {staffRegistrationRoleLabel(s.staffOperationalRoleKey ?? "")}:{" "}
                  <StatusBadge variant="registration" status={s.status} />
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="schedule-heading">
        <h2 id="schedule-heading">Schedule ({schedule?.timezone ?? event.timezone})</h2>
        {schedule?.entries?.length ? (
          <ol>
            {schedule.entries.map((e) => (
              <li key={e.id}>
                {e.label} — {e.scheduledStartAt} ({schedule.timezone}){" "}
                <StatusBadge variant="schedule" status={e.status} />
              </li>
            ))}
          </ol>
        ) : (
          <p>Schedule not yet published for this event.</p>
        )}
      </section>
    </>
  );
}
