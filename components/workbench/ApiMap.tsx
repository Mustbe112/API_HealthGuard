"use client";

import Link from "next/link";
import type { Endpoint } from "@/lib/types";
import type { TestRun } from "@/lib/types";
import { classifyOutcome } from "@/lib/outcome";
import { healthFromOutcome, type HealthStatus } from "@/lib/workbench-health";
import { buildPathTree, worstHealth, type PathTreeNode } from "@/lib/endpoint-tree";
import { resultForEndpoint } from "@/lib/project-context";
import { MethodBadge } from "@/components/MethodBadge";

export function ApiMap({
  projectId,
  baseUrl,
  endpoints,
  selectedRun,
}: {
  projectId: string;
  baseUrl: string;
  endpoints: Endpoint[];
  selectedRun: TestRun | null;
}) {
  const tree = buildPathTree(endpoints);
  const host = hostLabel(baseUrl);

  function healthOf(endpoint: Endpoint): HealthStatus | null {
    const result = resultForEndpoint(selectedRun, endpoint.id);
    return result ? healthFromOutcome(classifyOutcome(result)) : null;
  }

  function nodeHealth(node: PathTreeNode): HealthStatus | null {
    const here = node.endpoints.map(healthOf);
    const nested = node.children.map(nodeHealth);
    return worstHealth([...here, ...nested]);
  }

  const resources = tree.children;

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className={`min-w-[220px] rounded-md border px-5 py-3 text-center ${toneBox(nodeHealth(tree))}`}>
          <p className="text-[11px] uppercase tracking-wide text-text-muted">API host</p>
          <p className="mt-1 break-all font-mono text-sm font-medium text-text">{host}</p>
          <p className="mt-1 text-xs text-text-muted">
            {endpoints.length} route{endpoints.length === 1 ? "" : "s"} · {resources.length} resource
            {resources.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {tree.endpoints.length > 0 && (
        <div className="flex justify-center">
          <MethodRow projectId={projectId} endpoints={tree.endpoints} healthOf={healthOf} />
        </div>
      )}

      {resources.length > 0 && (
        <>
          <Connector count={resources.length} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {resources.map((node) => (
              <ResourceCard
                key={node.id}
                node={node}
                projectId={projectId}
                healthOf={healthOf}
                nodeHealth={nodeHealth}
              />
            ))}
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-text-muted">
        <Legend color="bg-healthy" label="Working" />
        <Legend color="bg-warning" label="Needs a login" />
        <Legend color="bg-unhealthy" label="Broken" />
        <Legend color="bg-text-muted/40" label="Not checked yet" />
      </div>
    </div>
  );
}

function ResourceCard({
  node,
  projectId,
  healthOf,
  nodeHealth,
}: {
  node: PathTreeNode;
  projectId: string;
  healthOf: (endpoint: Endpoint) => HealthStatus | null;
  nodeHealth: (node: PathTreeNode) => HealthStatus | null;
}) {
  return (
    <div className={`rounded-md border bg-surface p-4 ${toneBox(nodeHealth(node))}`}>
      <p className="font-mono text-sm font-semibold text-text">/{node.segment}</p>
      {node.endpoints.length > 0 && (
        <div className="mt-3">
          <MethodRow projectId={projectId} endpoints={node.endpoints} healthOf={healthOf} />
        </div>
      )}
      {node.children.length > 0 && (
        <div className="mt-3 space-y-3 border-l border-line pl-3">
          {node.children.map((child) => (
            <Branch
              key={child.id}
              node={child}
              projectId={projectId}
              healthOf={healthOf}
              nodeHealth={nodeHealth}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Branch({
  node,
  projectId,
  healthOf,
  nodeHealth,
}: {
  node: PathTreeNode;
  projectId: string;
  healthOf: (endpoint: Endpoint) => HealthStatus | null;
  nodeHealth: (node: PathTreeNode) => HealthStatus | null;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot(nodeHealth(node))}`} />
        <span className="font-mono text-xs text-text">/{node.segment}</span>
      </div>
      {node.endpoints.length > 0 && (
        <div className="mt-2">
          <MethodRow projectId={projectId} endpoints={node.endpoints} healthOf={healthOf} />
        </div>
      )}
      {node.children.length > 0 && (
        <div className="mt-2 space-y-2 border-l border-line pl-3">
          {node.children.map((child) => (
            <Branch
              key={child.id}
              node={child}
              projectId={projectId}
              healthOf={healthOf}
              nodeHealth={nodeHealth}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MethodRow({
  projectId,
  endpoints,
  healthOf,
}: {
  projectId: string;
  endpoints: Endpoint[];
  healthOf: (endpoint: Endpoint) => HealthStatus | null;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {endpoints.map((ep) => {
        const health = healthOf(ep);
        return (
          <Link
            key={ep.id}
            href={`/projects/${projectId}/endpoints/${ep.id}`}
            title={`${ep.method} ${ep.path}`}
            className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 hover:border-run/50 ${chip(health)}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${dot(health)}`} />
            <MethodBadge method={ep.method} />
          </Link>
        );
      })}
    </div>
  );
}

function Connector({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-center text-text-muted" aria-hidden>
      <div className="h-4 w-px bg-line" />
      <div className="h-px w-1/2 max-w-xl bg-line" />
      <p className="mt-1 text-[11px]">{count} top-level path{count === 1 ? "" : "s"}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function hostLabel(baseUrl: string): string {
  try {
    return new URL(baseUrl).origin;
  } catch {
    return baseUrl;
  }
}

function toneBox(health: HealthStatus | null): string {
  if (health === "healthy") return "border-healthy/30 bg-healthy-soft";
  if (health === "warning") return "border-warning/30 bg-warning-soft";
  if (health === "unhealthy") return "border-unhealthy/30 bg-unhealthy-soft";
  return "border-line bg-surface";
}

function chip(health: HealthStatus | null): string {
  if (health === "healthy") return "border-healthy/30 bg-healthy-soft";
  if (health === "warning") return "border-warning/30 bg-warning-soft";
  if (health === "unhealthy") return "border-unhealthy/30 bg-unhealthy-soft";
  return "border-line bg-bg";
}

function dot(health: HealthStatus | null): string {
  if (health === "healthy") return "bg-healthy";
  if (health === "warning") return "bg-warning";
  if (health === "unhealthy") return "bg-unhealthy";
  return "bg-text-muted/40";
}
