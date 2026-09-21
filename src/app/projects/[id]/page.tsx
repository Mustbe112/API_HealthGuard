"use client";

import Link from "next/link";
import { useState } from "react";
import { classifyOutcome, rollupResultsByEndpoint } from "@/lib/outcome";
import { useProject } from "@/lib/project-context";
import { healthFromOutcome } from "@/lib/workbench-health";
import { HealthBanner } from "@/components/workbench/HealthBanner";
import { HealthBadge } from "@/components/workbench/HealthBadge";
import { MethodBadge } from "@/components/MethodBadge";
import { LatencyBar } from "@/components/LatencyBar";
import { HealthCharts } from "@/components/workbench/HealthCharts";
import { PageHeader } from "@/components/workbench/PageHeader";
import { PageLoader, ProbeLoader } from "@/components/LoadingState";

type Filter = "all" | "working" | "login" | "broken";

export default function DashboardPage() {
  const { project, selectedRun, summary, openConnect, error, uploadMsg, addVariable, startRun, running, runs, isProbing, probePhase } =
    useProject();
  const [filter, setFilter] = useState<Filter>("all");
  const results = rollupResultsByEndpoint(selectedRun?.results ?? []);
  const maxMs = Math.max(1, ...results.map((r) => r.responseTimeMs ?? 0));
  const filtered = results.filter((r) => {
    const outcome = classifyOutcome(r);
    if (filter === "working") return outcome === "working";
    if (filter === "login") return outcome === "manual";
    if (filter === "broken") return outcome === "broken";
    return true;
  });

  if (!project) {
    return <PageLoader label="Opening project…" />;
  }

  if (isProbing) {
    return (
      <ProbeLoader
        title={probePhase === "discover" ? "Discovering your API" : "Running health check"}
        message={uploadMsg}
        baseUrl={project.baseUrl}
        phase={probePhase}
      />
    );
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
    <div>
      <PageHeader title="API health" subtitle={project.baseUrl} />
      {error && <p className="mb-4 text-sm text-unhealthy">{error}</p>}
      <div className="flex flex-col gap-4">
        <HealthBanner
          summary={summary}
          projectId={project.id}
          runId={selectedRun?.id}
          running={running}
          onSaveTokenAndRecheck={async (tokenValue) => {
            await addVariable("API_TOKEN", tokenValue, true);
            await startRun();
          }}
        />
        {summary.hasRun && (
          <HealthCharts
            counts={{
              workingCount: summary.workingCount,
              brokenCount: summary.brokenCount,
              skippedCount: summary.skippedCount,
              manualCount: summary.manualCount,
            }}
            results={results}
            runs={runs}
          />
        )}
        <div className="flex gap-1">
          {(["all", "working", "login", "broken"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs ${
                filter === f ? "bg-surface text-text" : "text-text-muted hover:text-text"
              }`}
            >
              {f === "all" ? "All" : f === "working" ? "Working" : f === "login" ? "Needs a login" : "Broken"}
            </button>
          ))}
        </div>
        <div className="wb-scroll">
          <table className="wb-table">
            <thead>
              <tr>
                <th className="w-20">Method</th>
                <th>Endpoint</th>
                <th className="w-20">Status</th>
                <th className="w-40">Latency</th>
                <th className="w-36">Health</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const outcome = classifyOutcome(r);
                const health = healthFromOutcome(outcome);
                return (
                  <tr key={r.id}>
                    <td>
                      <MethodBadge method={r.endpoint.method} />
                    </td>
                    <td className="truncate">
                      <Link
                        href={`/projects/${project.id}/endpoints/${r.endpointId}`}
                        className="font-mono text-xs hover:text-link"
                      >
                        {r.endpoint.path}
                      </Link>
                    </td>
                    <td className={`font-mono text-xs ${statusClass(r.statusCode)}`}>
                      {r.statusCode ?? "—"}
                    </td>
                    <td>
                      <LatencyBar
                        ms={r.responseTimeMs}
                        maxMs={maxMs}
                        tone={health === "unhealthy" ? "fail" : health === "healthy" ? "pass" : "pending"}
                      />
                    </td>
                    <td>
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
    </div>
  );
}

function statusClass(code: number | null): string {
  if (code == null) return "text-text-muted";
  if (code >= 500) return "text-unhealthy";
  if (code >= 400) return "text-warning";
  return "text-healthy";
}
