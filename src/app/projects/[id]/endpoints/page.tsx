"use client";

import Link from "next/link";
import { classifyOutcome } from "@/lib/outcome";
import { resultForEndpoint, useProject } from "@/lib/project-context";
import { healthFromOutcome } from "@/lib/workbench-health";
import { HealthBadge } from "@/components/workbench/HealthBadge";
import { MethodBadge } from "@/components/MethodBadge";

export default function EndpointsPage() {
  const { project, selectedRun, openConnect } = useProject();
  const endpoints = project?.endpoints ?? [];

  if (!project) return <p className="text-sm text-text-muted">Loading…</p>;
  if (endpoints.length === 0) {
    return (
      <div className="rounded-md border border-line bg-surface p-8 text-center">
        <p className="text-sm text-text-muted">
          No endpoints yet. Import an OpenAPI or Swagger spec to add POST, PUT, and DELETE routes.
        </p>
        <button
          type="button"
          onClick={() => openConnect()}
          className="mt-4 rounded bg-run px-3 py-1.5 text-sm font-medium text-white"
        >
          Import spec
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-text">Endpoints</h1>
      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-2 font-medium">Method</th>
              <th className="px-4 py-2 font-medium">Path</th>
              <th className="px-4 py-2 font-medium">Last status</th>
              <th className="px-4 py-2 font-medium">Health</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((ep) => {
              const result = resultForEndpoint(selectedRun, ep.id);
              const health = result ? healthFromOutcome(classifyOutcome(result)) : null;
              return (
                <tr key={ep.id} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-4 py-2">
                    <MethodBadge method={ep.method} />
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/projects/${project.id}/endpoints/${ep.id}`} className="font-mono text-xs hover:text-link">
                      {ep.path}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{result?.statusCode ?? "—"}</td>
                  <td className="px-4 py-2">{health ? <HealthBadge status={health} /> : <span className="text-xs text-text-muted">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
