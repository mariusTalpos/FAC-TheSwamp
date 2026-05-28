"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { EmptyState, EntityList, ProblemAlert } from "@/components/ui";
import { apiGet } from "@/lib/api/client";
import { useApiResource } from "@/hooks/use-api-resource";

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

  const { data, error } = useApiResource({
    resourceKey: `admin-user-audit-${userId}`,
    loader: () => apiGet<{ items: AuditEvent[] }>(`/api/admin/users/${userId}/audit?limit=50`),
  });

  const items = data?.items ?? [];

  return (
    <main>
      <h1>Audit trail</h1>
      {error ? <ProblemAlert message={error} /> : null}
      <EntityList
        items={items}
        keyExtractor={(e) => e.id}
        aria-label="Audit events"
        renderRow={(e) => (
          <>
            <strong>{e.eventType}</strong> — {new Date(e.createdAt).toLocaleString()}
            <pre style={{ fontSize: "0.8rem", overflow: "auto" }}>
              {JSON.stringify(e.payload, null, 2)}
            </pre>
          </>
        )}
        empty={<EmptyState title="No audit events found." />}
      />
      <p>
        <Link href={`/admin/users/${userId}`}>Back</Link>
      </p>
    </main>
  );
}
