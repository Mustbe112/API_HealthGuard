import { localTargetError } from "./local-target";

export type DiscoveredEndpoint = {
  name: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  path: string;
  expectedStatus: number;
  documentedStatuses: number[];
  requiresAuth: boolean;
};

export class LocalDiscoverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalDiscoverError";
  }
}

const FETCH_MS = 4000;

const SPEC_PATHS = [
  "/openapi.json",
  "/openapi.yaml",
  "/openapi.yml",
  "/swagger.json",
  "/swagger.yaml",
  "/swagger/v1/swagger.json",
  "/v3/api-docs",
  "/api-docs",
  "/api/openapi.json",
  "/api/swagger.json",
];

const PROBE_PATHS = [
  "/",
  "/health",
  "/healthz",
  "/ready",
  "/live",
  "/ping",
  "/status",
  "/api",
  "/api/health",
  "/api/v1",
  "/auth/login",
  "/auth/register",
  "/auth/signup",
  "/login",
  "/register",
  "/users",
  "/user",
  "/me",
  "/posts",
  "/items",
  "/products",
  "/orders",
  "/projects",
];

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const rel = path.startsWith("/") ? path : `/${path}`;
  return `${base}${rel}`;
}

async function fetchText(
  url: string,
  method: string = "GET",
  body?: string
): Promise<{ status: number; contentType: string; allow: string | null; text: string } | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/json, application/yaml, text/yaml, text/html;q=0.8, */*;q=0.5",
    };
    const writes = method === "POST" || method === "PUT" || method === "PATCH";
    if (writes) headers["Content-Type"] = "application/json";
    const res = await fetch(url, {
      method,
      mode: "cors",
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_MS),
      headers,
      body: writes ? (body ?? "{}") : undefined,
    });
    return {
      status: res.status,
      contentType: res.headers.get("content-type") ?? "",
      allow: res.headers.get("allow"),
      text: await res.text(),
    };
  } catch {
    return null;
  }
}

async function serverIsUp(origin: string): Promise<boolean> {
  try {
    await fetch(origin + "/", { mode: "no-cors", signal: AbortSignal.timeout(FETCH_MS) });
    return true;
  } catch {
    try {
      await fetch(origin + "/health", { mode: "no-cors", signal: AbortSignal.timeout(FETCH_MS) });
      return true;
    } catch {
      return false;
    }
  }
}

function looksJson(contentType: string, text: string): boolean {
  if (/json/i.test(contentType)) return true;
  const t = text.trim();
  return t.startsWith("{") || t.startsWith("[");
}

function looksHtml(contentType: string, text: string): boolean {
  if (/html/i.test(contentType)) return true;
  return /^\s*</.test(text) && /<html|<!doctype html/i.test(text);
}

function looksLikeSpec(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/"openapi"\s*:|"swagger"\s*:/.test(t) && /"paths"\s*:/.test(t)) return true;
  if (/openapi:\s*3/.test(t) && /\npaths:/.test(t)) return true;
  if (/"info"\s*:\s*\{/.test(t) && /"item"\s*:/.test(t) && /"schema"\s*:/.test(t)) return true;
  return false;
}

function parseAllow(header: string | null): (typeof METHODS)[number][] {
  if (!header) return [];
  const found: (typeof METHODS)[number][] = [];
  for (const part of header.split(",")) {
    const m = part.trim().toUpperCase() as (typeof METHODS)[number];
    if ((METHODS as readonly string[]).includes(m)) found.push(m);
  }
  return [...new Set(found)];
}

function isApiLike(status: number, contentType: string, text: string, allow: string | null): boolean {
  if (status === 502 || status === 503) return false;
  if (looksHtml(contentType, text) && status < 400) return false;
  if ([400, 401, 403, 404, 405, 409, 415, 422, 204].includes(status)) {
    return looksJson(contentType, text) || status !== 404;
  }
  if (status >= 200 && status < 500 && looksJson(contentType, text)) return true;
  if (parseAllow(allow).length > 0) return true;
  return false;
}

function probed(
  method: DiscoveredEndpoint["method"],
  path: string,
  status: number
): DiscoveredEndpoint {
  const requiresAuth = status === 401 || status === 403;
  return {
    name: `${method} ${path}`,
    method,
    path,
    expectedStatus: status >= 200 && status < 300 ? status : 200,
    documentedStatuses: [status, 200, 401, 404].filter((n, i, a) => a.indexOf(n) === i && n < 500),
    requiresAuth,
  };
}

export type BrowserDiscoverResult =
  | { kind: "spec"; specText: string; filename: string }
  | { kind: "probe"; endpoints: DiscoveredEndpoint[] };

export async function discoverLocalApi(baseUrl: string): Promise<BrowserDiscoverResult> {
  const origin = new URL(baseUrl).origin;
  const up = await serverIsUp(origin);
  if (!up) {
    throw new LocalDiscoverError(
      `Nothing is listening at ${origin}. Start your API on this computer, then use that process’s URL (not the HealthGuard website).`
    );
  }

  for (const path of SPEC_PATHS) {
    const hit = await fetchText(joinUrl(origin, path), "GET");
    if (hit && hit.status < 400 && looksLikeSpec(hit.text)) {
      const filename = path.endsWith(".yaml") || path.endsWith(".yml") ? "openapi.yaml" : "openapi.json";
      return { kind: "spec", specText: hit.text, filename };
    }
  }

  const found = new Map<string, DiscoveredEndpoint>();
  let corsHits = 0;
  for (const path of PROBE_PATHS) {
    const url = joinUrl(origin, path);
    const options = await fetchText(url, "OPTIONS");
    const get = await fetchText(url, "GET");
    if (options || get) corsHits += 1;
    const allow = parseAllow(options?.allow ?? get?.allow ?? null);
    if (allow.length > 0) {
      for (const method of allow) {
        found.set(`${method} ${path}`, probed(method, path, get?.status ?? 200));
      }
      continue;
    }
    if (get && isApiLike(get.status, get.contentType, get.text, get.allow)) {
      found.set(`GET ${path}`, probed("GET", path, get.status));
    }
  }

  if (found.size === 0 && corsHits === 0) {
    throw new LocalDiscoverError(localTargetError(origin));
  }

  return { kind: "probe", endpoints: [...found.values()] };
}
