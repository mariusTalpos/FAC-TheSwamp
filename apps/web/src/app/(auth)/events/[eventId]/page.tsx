"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type {
  EventResponse,
  EventScheduleResponse,
  MyEventRegistrationsResponse,
} from "@/lib/events/contracts";
import {
  staffRegistrationRoleLabel,
  staffRegistrationRoleOptions,
} from "@/lib/events/staff-registration-roles";

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [regs, setRegs] = useState<MyEventRegistrationsResponse | null>(null);
  const [schedule, setSchedule] = useState<EventScheduleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [staffRoleOptions, setStaffRoleOptions] = useState<string[]>([]);
  const [staffRole, setStaffRole] = useState("");

  const load = useCallback(async () => {
    const [evRes, regRes, schedRes, meRes] = await Promise.all([
      fetch(`/api/events/${eventId}`),
      fetch(`/api/events/${eventId}/registrations/me`),
      fetch(`/api/events/${eventId}/schedule`),
      fetch("/api/me"),
    ]);
    if (evRes.ok) setEvent((await evRes.json()) as EventResponse);
    if (regRes.ok) setRegs((await regRes.json()) as MyEventRegistrationsResponse);
    if (schedRes.ok) setSchedule((await schedRes.json()) as EventScheduleResponse);
    if (meRes.ok) {
      const me = (await meRes.json()) as { roleKeys?: string[] };
      const options = staffRegistrationRoleOptions(me.roleKeys ?? []);
      setStaffRoleOptions(options);
      setStaffRole((current) =>
        current && options.includes(current) ? current : (options[0] ?? ""),
      );
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function registerFighter() {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/events/${eventId}/registrations/fighter`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Registration failed");
      return;
    }
    setMessage(`Fighter registration: ${data.status as string}`);
    await load();
  }

  async function withdrawFighter() {
    setError(null);
    const res = await fetch(`/api/events/${eventId}/registrations/fighter/withdraw`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Withdraw failed");
      return;
    }
    setMessage("Fighter registration withdrawn");
    await load();
  }

  async function confirmAttendance() {
    setError(null);
    const res = await fetch(`/api/events/${eventId}/registrations/fighter/confirm`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Confirmation failed");
      return;
    }
    setMessage("Attendance confirmed");
    await load();
  }

  async function registerStaff() {
    if (!staffRole) return;
    setError(null);
    const res = await fetch(`/api/events/${eventId}/registrations/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operationalRoleKey: staffRole }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Staff registration failed");
      return;
    }
    setMessage(`Staff registration (${staffRole}): ${data.status as string}`);
    await load();
  }

  if (!event) {
    return (
      <main>
        <p>Loading…</p>
      </main>
    );
  }

  const fighter = regs?.fighter;
  const needsConfirm =
    event.fighterConfirmationRequiredDaysBefore != null &&
    fighter?.status === "submitted";

  return (
    <main>
      <h1>{event.name}</h1>
      <p>
        <Link href="/events">All events</Link> · <Link href="/me">Account</Link>
      </p>
      <p>
        Starts: {event.startsAt} ({event.timezone}) · {event.venueLabel}
      </p>
      {event.description ? <p>{event.description}</p> : null}
      {error ? (
        <p role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p>{message}</p> : null}

      <section aria-labelledby="fighter-reg-heading">
        <h2 id="fighter-reg-heading">Fighter registration</h2>
        {fighter ? (
          <>
            <p>
              Status: <strong>{fighter.status}</strong>
              {fighter.teamNameSnapshot
                ? ` · Team (informational): ${fighter.teamNameSnapshot}`
                : " · Unaffiliated"}
            </p>
            {needsConfirm ? (
              <button type="button" onClick={() => void confirmAttendance()}>
                Confirm attendance
              </button>
            ) : null}
            {["submitted", "confirmed", "waitlisted"].includes(fighter.status) ? (
              <button type="button" onClick={() => void withdrawFighter()}>
                Withdraw fighter registration
              </button>
            ) : null}
          </>
        ) : (
          <button type="button" onClick={() => void registerFighter()}>
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
          <button type="button" onClick={() => void registerStaff()} disabled={!staffRole}>
            Register as staff
          </button>
          {regs?.staff?.length ? (
            <ul>
              {regs.staff.map((s) => (
                <li key={s.id}>
                  {staffRegistrationRoleLabel(s.staffOperationalRoleKey ?? "")}: {s.status}
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
                {e.label} — {e.scheduledStartAt} ({schedule.timezone}) [{e.status}]
              </li>
            ))}
          </ol>
        ) : (
          <p>Schedule not yet published for this event.</p>
        )}
      </section>
    </main>
  );
}
