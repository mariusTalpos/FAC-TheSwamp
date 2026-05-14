"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function PublicFighterPage() {
  const { fighterId } = useParams<{ fighterId: string }>();
  const [data, setData] = useState<{ displayName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fighterId) return;
    void (async () => {
      const res = await fetch(`/api/public/fighters/${fighterId}`);
      if (!res.ok) {
        setError("Fighter profile is not available.");
        return;
      }
      setData(await res.json());
    })();
  }, [fighterId]);

  if (error) {
    return (
      <main>
        <p className="error">{error}</p>
        <Link href="/">Home</Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main>
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main>
      <h1>{data.displayName}</h1>
      <p>Public fighter profile.</p>
      <Link href="/">Home</Link>
    </main>
  );
}
