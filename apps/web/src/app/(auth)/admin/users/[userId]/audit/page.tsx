"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type AuditEvent = {
  id: string;
  eventType: string;
  actorUserId: string | null;
  targetUserId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export default function AdminUserAuditPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [items, setItems] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/admin/users/${userId}/audit?limit=50`);
      if (!res.ok) {
        setError("Could not load audit trail.");
        return;
      }
      const data = (await res.json()) as { items: AuditEvent[] };
      setItems(data.items);
    })();
  }, [userId]);

  return (
    <main>
      <h1>Audit trail</h1>
      {error ? <p className="error">{error}</p> : null}
      <ol>
        {items.map((e) => (
          <li key={e.id}>
            <strong>{e.eventType}</strong> — {new Date(e.createdAt).toLocaleString()}
            <pre style={{ fontSize: "0.8rem", overflow: "auto" }}>
              {JSON.stringify(e.payload, null, 2)}
            </pre>
          </li>
        ))}
      </ol>
      <p>
        <Link href={`/admin/users/${userId}`}>Back</Link>
      </p>
    </main>
  );
}
