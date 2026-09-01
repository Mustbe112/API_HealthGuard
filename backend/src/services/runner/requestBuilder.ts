import { Probe } from "./zeroInput";

export interface BuiltRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

/** Replaces {{var}} tokens (Postman-style) using resolved env vars. Leaves
 * unresolved tokens as-is so a missing var is visible in the actual
 * request rather than silently dropped. */
function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match);
}

export function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const rel = path.startsWith("/") ? path : `/${path}`;
  return `${base}${rel}`;
}

/** `{id}` (OpenAPI) and `/:id` (Express/Postman) become a fresh UUID so
 * the request never needs a real record. */
export function fillPathParams(path: string): string {
  return path
    .replace(/\{\{[^}]+\}\}/g, () => crypto.randomUUID())
    .replace(/\{[^}]+\}/g, () => crypto.randomUUID())
    .replace(/\/:([^/?#]+)/g, () => `/${crypto.randomUUID()}`);
}

export function buildZeroInputRequest(
  endpoint: {
    method: string;
    path: string;
    headers: unknown;
  },
  baseUrl: string,
  probe: Probe,
  resolvedVars: Record<string, string>,
  authToken: string | null
): BuiltRequest {
  const interpolated = interpolate(endpoint.path, resolvedVars);
  const path = probe.fillPathParams ? fillPathParams(interpolated) : interpolated;
  const url = joinUrl(baseUrl, path);

  const headers: Record<string, string> = {};
  const staticHeaders = (endpoint.headers as Record<string, string>) ?? {};
  for (const [key, value] of Object.entries(staticHeaders)) {
    if (key.toLowerCase() === "authorization" && !probe.sendAuth) continue;
    headers[key] = interpolate(value, resolvedVars);
  }

  if (probe.sendEmptyBody) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }

  if (probe.sendAuth && authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  return {
    url,
    method: endpoint.method,
    headers,
    body: probe.sendEmptyBody ? "{}" : undefined,
  };
}

export function buildRegisterRequest(
  endpoint: { method: string; path: string },
  baseUrl: string,
  body: Record<string, unknown>
): BuiltRequest {
  return {
    url: joinUrl(baseUrl, endpoint.path),
    method: endpoint.method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
