"use client";

import { useProject } from "@/lib/project-context";
import { ApiMap } from "@/components/workbench/ApiMap";

export default function ApiMapPage() {
  const { project, selectedRun, openConnect } = useProject();
  const endpoints = project?.endpoints ?? [];

  if (!project) return <p className="text-sm text-text-muted">Loading…</p>;

  if (endpoints.length === 0) {
    return (
      <div className="rounded-md border border-line bg-surface p-8 text-center">
        <p className="text-sm text-text-muted">
          No endpoints to map yet. Discover from the Base URL or import an OpenAPI spec first.
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
      <div>
        <h1 className="text-xl font-semibold text-text">API map</h1>
        <p className="text-sm text-text-muted">
          How routes hang off this host. Color is from the last health check. Click a method to open
          it.
        </p>
      </div>
      <ApiMap
        projectId={project.id}
        baseUrl={project.baseUrl}
        endpoints={endpoints}
        selectedRun={selectedRun}
      />
    </div>
  );
}
