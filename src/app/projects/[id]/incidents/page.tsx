"use client";

import Link from "next/link";
import { useProject } from "@/lib/project-context";
import { MethodBadge } from "@/components/MethodBadge";
import { formatLatency } from "@/lib/workbench-health";
import { PageHeader } from "@/components/workbench/PageHeader";

export default function IncidentsPage() {
  const { incidents, projectId } = useProject();

  return (
    <div>
      <PageHeader title="Incidents" />
      {incidents.length === 0 ? (
        <p className="text-sm text-text-muted">No broken probes in the current run.</p>
      ) : (
        <div className="wb-scroll">
          <table className="wb-table">
            <thead>
              <tr>
                <th>Endpoint</th>
                <th className="w-24">Status</th>
                <th className="w-28">Latency</th>
                <th className="w-44">Detected</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr key={inc.id}>
                  <td className="truncate">
                    <Link href={`/projects/${projectId}/incidents/${inc.id}`} className="flex min-w-0 items-center gap-2">
                      <MethodBadge method={inc.method} />
                      <span className="truncate font-mono text-xs">{inc.path}</span>
                    </Link>
                  </td>
                  <td className="font-mono text-xs text-unhealthy">{inc.statusCode ?? "timeout"}</td>
                  <td className="text-xs">{formatLatency(inc.latencyMs)}</td>
                  <td className="truncate text-xs text-text-muted">{new Date(inc.detectedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
