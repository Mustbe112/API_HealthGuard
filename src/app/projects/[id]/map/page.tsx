"use client";

import { useProject } from "@/lib/project-context";
import { ApiMap } from "@/components/workbench/ApiMap";
import { PageHeader } from "@/components/workbench/PageHeader";

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
    <div>
      <PageHeader
        title="API map"
        subtitle="Color is from the last health check. Click a method to open it."
      />
      <ApiMap
        projectId={project.id}
        baseUrl={project.baseUrl}
        endpoints={endpoints}
        selectedRun={selectedRun}
      />
    </div>
  );
}
