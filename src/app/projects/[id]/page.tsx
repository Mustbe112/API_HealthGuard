"use client";

import Link from "next/link";
import { useState } from "react";
import { classifyOutcome } from "@/lib/outcome";
import { useProject } from "@/lib/project-context";
import { healthFromOutcome } from "@/lib/workbench-health";
import { HealthBanner } from "@/components/workbench/HealthBanner";
import { HealthBadge } from "@/components/workbench/HealthBadge";
import { MethodBadge } from "@/components/MethodBadge";
import { LatencyBar } from "@/components/LatencyBar";

type Filter = "all" | "passed" | "failed";

export default function DashboardPage() {
  const { project, selectedRun, summary, openConnect, error, uploadMsg } = useProject();
  const [filter, setFilter] = useState<Filter>("all");
  const results = selectedRun?.results ?? [];
  const maxMs = Math.max(1, ...results.map((r) => r.responseTimeMs ?? 0));
  const filtered = results.filter((r) => {
    const health = healthFromOutcome(classifyOutcome(r));
    if (filter === "passed") return health === "healthy";
    if (filter === "failed") return health !== "healthy";
    return true;
  });

  if (!project) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  if (!(project.endpoints?.length) && !selectedRun) {
    return (
      <div className="rounded-md border border-line bg-surface p-8 text-center">
        <p className="text-sm text-text-muted">
          No endpoints yet. Discovery from the API Base URL may only find GET routes. Import an
          OpenAPI or Swagger spec to add the rest.
        </p>
        <button
          type="button"
          onClick={() => openConnect()}
          className="mt-4 rounded bg-run px-3 py-1.5 text-sm font-medium text-white"
        >
          Import spec
        </button>
        {uploadMsg && <p className="mt-3 text-xs text-text-muted">{uploadMsg}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-text">API health</h1>
        <p className="text-sm text-text-muted">{project.baseUrl}</p>
      </div>
      {error && <p className="text-sm text-unhealthy">{error}</p>}
      <HealthBanner summary={summary} />
      <div className="flex gap-1">
        {(["all", "passed", "failed"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs ${
              filter === f ? "bg-surface text-text" : "text-text-muted hover:text-text"
            }`}
          >
            {f === "all" ? "All" : f === "passed" ? "Passed" : "Failed"}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-2 font-medium">Method</th>
              <th className="px-4 py-2 font-medium">Endpoint</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Latency</th>
              <th className="px-4 py-2 font-medium">Health</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const outcome = classifyOutcome(r);
              const health = healthFromOutcome(outcome);
              return (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-4 py-2">
                    <MethodBadge method={r.endpoint.method} />
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/projects/${project.id}/endpoints/${r.endpointId}`} className="font-mono text-xs hover:text-link">
                      {r.endpoint.path}
                    </Link>
                  </td>
                  <td className={`px-4 py-2 font-mono text-xs ${statusClass(r.statusCode)}`}>
                    {r.statusCode ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <LatencyBar
                      ms={r.responseTimeMs}
                      maxMs={maxMs}
                      tone={health === "unhealthy" ? "fail" : health === "healthy" ? "pass" : "pending"}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <HealthBadge status={health} />
                    {outcome === "manual" && (
                      <Link
                        href={`/projects/${project.id}/endpoints/${r.endpointId}?tab=try`}
                        className="ml-2 text-[11px] text-link hover:underline"
                      >
                        Open Try
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function statusClass(code: number | null): string {
  if (code == null) return "text-text-muted";
  if (code >= 500) return "text-unhealthy";
  if (code >= 400) return "text-warning";
  return "text-healthy";
}
