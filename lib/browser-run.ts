import type { Endpoint, ManualTryResult, RequestSnapshot } from "./types";

function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const rel = path.startsWith("/") ? path : `/${path}`;
  return `${base}${rel}`;
}

function fillPathParams(path: string): string {
  return path
    .replace(/\{\{[^}]+\}\}/g, () => crypto.randomUUID())
    .replace(/\{[^}]+\}/g, () => crypto.randomUUID())
    .replace(/\/:([^/?#]+)/g, () => `/${crypto.randomUUID()}`);
}

function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match);
}

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

export type BrowserProbeResult = {
  endpointId: string;
  statusCode: number | null;
  responseTimeMs: number | null;
  passed: boolean;
  errorMessage: string | null;
  responseBody: unknown;
  probe: {
    sent: string;
    expected: number[];
    proves: string;
    request?: RequestSnapshot;
  };
};

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function probeLocalEndpoint(
  endpoint: Endpoint,
  baseUrl: string,
  vars: Record<string, string>,
  authToken: string | null
): Promise<BrowserProbeResult> {
  const documented = Array.isArray(endpoint.documentedStatuses)
    ? endpoint.documentedStatuses.filter((n) => n < 500)
    : [endpoint.expectedStatus];
  const path = fillPathParams(interpolate(endpoint.path, vars));
  const url = joinUrl(baseUrl, path);
  const headers: Record<string, string> = {};
  if (BODY_METHODS.has(endpoint.method)) headers["Content-Type"] = "application/json";
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const body = BODY_METHODS.has(endpoint.method) ? "{}" : undefined;
  const request: RequestSnapshot = {
    url,
    method: endpoint.method,
    headers: { ...headers, ...(headers.Authorization ? { Authorization: "Bearer ••••••••" } : {}) },
    body,
  };

  const startedAt = performance.now();
  try {
    const res = await fetch(url, {
      method: endpoint.method,
      mode: "cors",
      headers,
      body,
      signal: AbortSignal.timeout(8000),
    });
    const responseTimeMs = Math.round(performance.now() - startedAt);
    const responseBody = await parseBody(res);
    const passed = res.status < 500;
    return {
      endpointId: endpoint.id,
      statusCode: res.status,
      responseTimeMs,
      passed,
      errorMessage:
        res.status >= 500
          ? `${endpoint.path} returned ${res.status}`
          : res.status === 401 || res.status === 403
            ? "Route is live but needs a real login"
            : null,
      responseBody,
      probe: {
        sent: WRITE_METHODS.has(endpoint.method) ? "Empty body from your browser" : "Browser probe",
        expected: documented.length > 0 ? documented : [200],
        proves: "Probed from your browser so Railway can reach localhost",
        request,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown network error";
    return {
      endpointId: endpoint.id,
      statusCode: null,
      responseTimeMs: Math.round(performance.now() - startedAt),
      passed: false,
      errorMessage: `Request failed: ${message}`,
      responseBody: null,
      probe: {
        sent: "Browser probe",
        expected: documented.length > 0 ? documented : [200],
        proves: "Your browser could not reach this localhost route (API down, or CORS blocked)",
        request,
      },
    };
  }
}

export async function tryLocalEndpoint(input: {
  baseUrl: string;
  method: string;
  pathTemplate: string;
  pathParams: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string>;
  body?: string;
  bearerToken?: string;
}): Promise<ManualTryResult> {
  let path = input.pathTemplate
    .replace(/\{([^}]+)\}/g, (_, key: string) => encodeURIComponent(input.pathParams[key] ?? ""))
    .replace(/\/:([^/?#]+)/g, (_, key: string) => `/${encodeURIComponent(input.pathParams[key] ?? "")}`);
  const urlObj = new URL(joinUrl(input.baseUrl, path));
  for (const [key, value] of Object.entries(input.query)) {
    if (value !== "") urlObj.searchParams.set(key, value);
  }
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.headers)) {
    if (key.trim() && key.toLowerCase() !== "host") headers[key] = value;
  }
  const hasBody = BODY_METHODS.has(input.method.toUpperCase()) && Boolean(input.body);
  if (hasBody && !Object.keys(headers).some((k) => k.toLowerCase() === "content-type")) {
    headers["Content-Type"] = "application/json";
  }
  if (input.bearerToken) headers.Authorization = `Bearer ${input.bearerToken}`;

  const request: RequestSnapshot = {
    url: urlObj.toString(),
    method: input.method.toUpperCase(),
    headers: {
      ...headers,
      ...(headers.Authorization ? { Authorization: "Bearer ••••••••" } : {}),
    },
    body: hasBody ? input.body : undefined,
  };

  const startedAt = performance.now();
  try {
    const res = await fetch(urlObj.toString(), {
      method: input.method.toUpperCase(),
      mode: "cors",
      headers,
      body: hasBody ? input.body : undefined,
      signal: AbortSignal.timeout(15000),
    });
    return {
      statusCode: res.status,
      responseTimeMs: Math.round(performance.now() - startedAt),
      responseBody: await parseBody(res),
      responseHeaders: Object.fromEntries(res.headers.entries()),
      errorMessage: null,
      request,
    };
  } catch (err: unknown) {
    return {
      statusCode: null,
      responseTimeMs: Math.round(performance.now() - startedAt),
      responseBody: null,
      responseHeaders: {},
      errorMessage: `Request failed: ${err instanceof Error ? err.message : "unknown network error"}`,
      request,
    };
  }
}
