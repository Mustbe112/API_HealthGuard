import type { Endpoint, HttpMethod } from "./types";
import type { HealthStatus } from "./workbench-health";

export type PathTreeNode = {
  id: string;
  segment: string;
  fullPath: string;
  children: PathTreeNode[];
  endpoints: Endpoint[];
};

export function splitPath(path: string): string[] {
  return path.split("/").filter(Boolean);
}

export function buildPathTree(endpoints: Endpoint[]): PathTreeNode {
  const root: PathTreeNode = {
    id: "root",
    segment: "/",
    fullPath: "/",
    children: [],
    endpoints: [],
  };

  for (const endpoint of endpoints) {
    const parts = splitPath(endpoint.path);
    if (parts.length === 0) {
      root.endpoints.push(endpoint);
      continue;
    }

    let current = root;
    let acc = "";
    for (const part of parts) {
      acc += `/${part}`;
      let child = current.children.find((c) => c.segment === part);
      if (!child) {
        child = {
          id: acc,
          segment: part,
          fullPath: acc,
          children: [],
          endpoints: [],
        };
        current.children.push(child);
      }
      current = child;
    }
    current.endpoints.push(endpoint);
  }

  sortTree(root);
  return root;
}

function sortTree(node: PathTreeNode) {
  node.children.sort((a, b) => a.segment.localeCompare(b.segment));
  node.endpoints.sort((a, b) => methodOrder(a.method) - methodOrder(b.method));
  for (const child of node.children) sortTree(child);
}

function methodOrder(method: HttpMethod): number {
  const order: HttpMethod[] = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"];
  const i = order.indexOf(method);
  return i === -1 ? 99 : i;
}

export function worstHealth(values: Array<HealthStatus | null | undefined>): HealthStatus | null {
  if (values.some((v) => v === "unhealthy")) return "unhealthy";
  if (values.some((v) => v === "warning")) return "warning";
  if (values.some((v) => v === "healthy")) return "healthy";
  return null;
}
