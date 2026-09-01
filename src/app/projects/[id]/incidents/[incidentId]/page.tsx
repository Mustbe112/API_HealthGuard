"use client";

import { use } from "react";
import Link from "next/link";
import { useProject } from "@/lib/project-context";
import { MethodBadge } from "@/components/MethodBadge";
import { formatLatency } from "@/lib/workbench-health";

export default function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string; incidentId: string }>;
}) {
  const { incidentId } = use(params);
  const { incidents, projectId } = useProject();
  const incident = incidents.find((i) => i.id === incidentId);

  if (!incident) {
    return (
      <p className="text-sm text-text-muted">
        Incident not in the current run.{" "}
        <Link href={`/projects/${projectId}/incidents`} className="text-link">
          Back to incidents
        </Link>
      </p>
    );
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold text-text">Incident</h1>
      <div className="rounded-md border border-line bg-surface p-4 text-sm">
        <Row label="Endpoint">
          <span className="flex items-center gap-2">
            <MethodBadge method={incident.method} />
            <Link href={`/projects/${projectId}/endpoints/${incident.endpointId}`} className="font-mono text-xs text-link">
              {incident.path}
            </Link>
          </span>
        </Row>
        <Row label="Status">{incident.statusCode ?? "timeout"}</Row>
        <Row label="Latency">{formatLatency(incident.latencyMs)}</Row>
        <Row label="Detected">{new Date(incident.detectedAt).toLocaleString()}</Row>
        <Row label="Reason">{incident.reason}</Row>
        <Row label="State">Open</Row>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2 last:border-0">
      <span className="text-text-muted">{label}</span>
      <span className="text-right text-text">{children}</span>
    </div>
  );
}
