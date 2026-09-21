"use client";

import Link from "next/link";
import { classifyOutcome } from "@/lib/outcome";
import { resultForEndpoint, useProject } from "@/lib/project-context";
import { healthFromOutcome } from "@/lib/workbench-health";
import { HealthBadge } from "@/components/workbench/HealthBadge";
import { MethodBadge } from "@/components/MethodBadge";
import { PageHeader } from "@/components/workbench/PageHeader";

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
    <div>
      <PageHeader
        title="Endpoints"
        actions={
          <Link href={`/projects/${project.id}/map`} className="text-sm text-link hover:underline">
            View API map
          </Link>
        }
      />
      <div className="wb-scroll">
        <table className="wb-table">
          <thead>
            <tr>
              <th className="w-20">Method</th>
              <th>Path</th>
              <th className="w-28">Last status</th>
              <th className="w-32">Health</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((ep) => {
              const result = resultForEndpoint(selectedRun, ep.id);
              const health = result ? healthFromOutcome(classifyOutcome(result)) : null;
              return (
                <tr key={ep.id}>
                  <td>
                    <MethodBadge method={ep.method} />
                  </td>
                  <td className="truncate">
                    <Link
                      href={`/projects/${project.id}/endpoints/${ep.id}`}
                      className="font-mono text-xs hover:text-link"
                    >
                      {ep.path}
                    </Link>
                  </td>
                  <td className="font-mono text-xs">{result?.statusCode ?? "—"}</td>
                  <td>
                    {health ? <HealthBadge status={health} /> : <span className="text-xs text-text-muted">—</span>}
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
