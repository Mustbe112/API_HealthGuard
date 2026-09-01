"use client";

import { use, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { classifyOutcome } from "@/lib/outcome";
import { resultForEndpoint, useProject } from "@/lib/project-context";
import { formatLatency, healthFromOutcome } from "@/lib/workbench-health";
import { EndpointTester } from "@/components/EndpointTester";
import { HealthBadge } from "@/components/workbench/HealthBadge";
import { MethodBadge } from "@/components/MethodBadge";

export default function EndpointDetailPage({
  params,
}: {
  params: Promise<{ id: string; endpointId: string }>;
}) {
  const { endpointId } = use(params);
  const search = useSearchParams();
  const { token } = useAuth();
  const { project, selectedRun, projectId } = useProject();
  const router = useRouter();
  const initialTab = search.get("tab") === "try" ? "try" : "results";
  const [tab, setTab] = useState<"results" | "log" | "try">(initialTab);

  const endpoint = project?.endpoints?.find((e) => e.id === endpointId);
  const result = resultForEndpoint(selectedRun, endpointId);
  const health = result ? healthFromOutcome(classifyOutcome(result)) : "warning";
  const req = result?.probe?.request;

  const prettyBody = useMemo(() => prettyJson(result?.responseBody), [result?.responseBody]);

  if (!token || !project || !endpoint) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <MethodBadge method={endpoint.method} />
        <h1 className="font-mono text-xl font-semibold text-text">{endpoint.path}</h1>
        <HealthBadge status={health} />
      </div>
      <div className="flex flex-wrap gap-6 rounded-md border border-line bg-surface px-4 py-3 text-sm">
        <Metric label="Expected / actual" value={`${endpoint.expectedStatus} / ${result?.statusCode ?? "—"}`} />
        <Metric label="Avg latency" value={formatLatency(result?.responseTimeMs ?? null)} />
        <Metric label="Probe" value={result?.probe?.sent ?? "—"} />
      </div>
      <div className="rounded-md border border-line bg-surface">
        <div className="flex gap-4 border-b border-line px-4">
          {(["results", "log", "try"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`border-b-2 py-2 text-sm ${
                tab === t ? "border-run text-text" : "border-transparent text-text-muted"
              }`}
              onClick={() => setTab(t)}
            >
              {t === "results" ? "Test results" : t === "log" ? "Console log" : "Try"}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tab === "try" ? (
            <EndpointTester
              token={token}
              projectId={projectId}
              endpoints={project.endpoints ?? []}
              selectedId={endpointId}
              onSelect={(id) => router.push(`/projects/${projectId}/endpoints/${id}?tab=try`)}
            />
          ) : tab === "log" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-text-muted">Request</p>
                {req ? (
                  <pre className="max-h-80 overflow-auto rounded border border-line bg-bg p-2 font-mono text-[11px]">
                    {req.method} {req.url}
                    {"\n"}
                    {Object.entries(req.headers)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join("\n")}
                    {req.body ? `\n\n${req.body}` : ""}
                  </pre>
                ) : (
                  <p className="text-xs text-text-muted">No request was sent.</p>
                )}
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-text-muted">Response</p>
                <pre className="max-h-80 overflow-auto rounded border border-line bg-bg p-2 font-mono text-[11px]">
                  {prettyBody || "(empty)"}
                </pre>
              </div>
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              <li className={result?.passed ? "text-healthy" : "text-unhealthy"}>
                {result?.passed ? "PASS" : "FAIL"} · Status / outcome · {health}
              </li>
              {result?.probe?.proves && <li className="text-text-muted">{result.probe.proves}</li>}
              {result?.probe?.caution && <li className="text-warning">{result.probe.caution}</li>}
              {result?.errorMessage && <li className="text-unhealthy">{result.errorMessage}</li>}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-text-muted">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function prettyJson(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
