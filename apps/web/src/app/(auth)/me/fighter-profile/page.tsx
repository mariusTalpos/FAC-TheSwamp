"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Profile = {
  id: string;
  completionState: string;
  displayName: string;
  ringName: string | null;
  visibility: Record<string, { public: boolean }>;
};

export default function FighterProfileEditorPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [ringName, setRingName] = useState("");
  const [ringPublic, setRingPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const ringNameTrimmed = ringName.trim();
  const canToggleRingPublic = ringNameTrimmed.length > 0;

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/me/fighter-profile");
      if (!res.ok) return;
      const data = (await res.json()) as Profile;
      setProfile(data);
      setDisplayName(data.displayName ?? "");
      setRingName(data.ringName ?? "");
      setRingPublic(data.visibility?.ringName?.public !== false);
    })();
  }, []);

  useEffect(() => {
    if (!canToggleRingPublic) {
      setRingPublic(false);
    }
  }, [canToggleRingPublic]);

  async function save() {
    if (!profile) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/me/fighter-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          ringName: ringNameTrimmed || null,
          visibility: canToggleRingPublic
            ? { ringName: { public: ringPublic } }
            : { ringName: { public: false } },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : "Could not save profile");
        return;
      }
      const next = data as Profile;
      setProfile(next);
      setRingName(next.ringName ?? "");
      setRingPublic(next.visibility?.ringName?.public !== false);
    } finally {
      setPending(false);
    }
  }

  if (!profile) {
    return (
      <main>
        <p>Loading profile…</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Fighter profile</h1>
      <p>
        Completion: <strong>{profile.completionState}</strong>
        {profile.completionState === "incomplete"
          ? " — add a display name to meet the minimum policy."
          : null}
      </p>
      <div className="stack">
        <div className="field">
          <label htmlFor="displayName">Display name</label>
          <input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="ringName">Ring name</label>
          <input
            id="ringName"
            value={ringName}
            onChange={(e) => setRingName(e.target.value)}
            aria-describedby="ringName-hint"
          />
          <p id="ringName-hint" className="hint">
            Optional. Enter a ring name before you can show it on your public fighter page.
          </p>
        </div>
        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={ringPublic}
              disabled={!canToggleRingPublic}
              onChange={(e) => setRingPublic(e.target.checked)}
            />{" "}
            Show ring name on the public fighter page
          </label>
          {!canToggleRingPublic ? (
            <p className="hint">Add a ring name above to enable this option.</p>
          ) : null}
        </div>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="button" onClick={() => void save()} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      <p>
        <Link href={`/fighters/${profile.id}`}>View public page</Link>
      </p>
      <p>
        <Link href="/me">Back</Link>
      </p>
    </main>
  );
}
