"use client";

import Link from "next/link";
import { useProject } from "@/lib/project-context";
import { MethodBadge } from "@/components/MethodBadge";
import { formatLatency } from "@/lib/workbench-health";

export default function IncidentsPage() {
  const { incidents, projectId } = useProject();

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-text">Incidents</h1>
      {incidents.length === 0 ? (
        <p className="text-sm text-text-muted">No broken probes in the current run.</p>
      ) : (
        <div className="rounded-md border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-text-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-2 font-medium">Endpoint</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Latency</th>
                <th className="px-4 py-2 font-medium">Detected</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr key={inc.id} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-4 py-2">
                    <Link href={`/projects/${projectId}/incidents/${inc.id}`} className="flex items-center gap-2">
                      <MethodBadge method={inc.method} />
                      <span className="font-mono text-xs">{inc.path}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-unhealthy">{inc.statusCode ?? "timeout"}</td>
                  <td className="px-4 py-2 text-xs">{formatLatency(inc.latencyMs)}</td>
                  <td className="px-4 py-2 text-xs text-text-muted">{new Date(inc.detectedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
