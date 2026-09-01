import yaml from "js-yaml";
import { parseSpecDocument, UnsupportedSpecError } from "../parsers";
import { NormalizedEndpoint, NormalizedMethod } from "../parsers/types";

const FETCH_MS = 4000;
const MAX_BODY = 5 * 1024 * 1024;

const SPEC_PATHS = [
  "/openapi.json",
  "/openapi.yaml",
  "/openapi.yml",
  "/swagger.json",
  "/swagger.yaml",
  "/swagger/v1/swagger.json",
  "/swagger/v1/swagger.yaml",
  "/v3/api-docs",
  "/v3/api-docs.yaml",
  "/v2/api-docs",
  "/api-docs",
  "/api-docs.json",
  "/api/openapi.json",
  "/api/swagger.json",
  "/api/v1/openapi.json",
  "/api/v1/swagger.json",
  "/api/v3/api-docs",
  "/docs/openapi.json",
  "/docs/swagger.json",
  "/q/openapi",
  "/q/swagger",
  "/v3/api-docs/swagger-config",
];

const DOCS_PAGES = ["/", "/docs", "/redoc", "/swagger", "/swagger-ui", "/swagger-ui/index.html", "/api/docs"];

const PROBE_PATHS = [
  "/",
  "/health",
  "/healthz",
  "/ready",
  "/live",
  "/ping",
  "/status",
  "/version",
  "/info",
  "/api",
  "/api/health",
  "/api/v1",
  "/api/v1/health",
  "/auth/login",
  "/auth/register",
  "/auth/signup",
  "/auth/signin",
  "/auth/token",
  "/login",
  "/register",
  "/signup",
  "/token",
  "/users",
  "/user",
  "/me",
  "/profile",
  "/posts",
  "/items",
  "/products",
  "/orders",
  "/projects",
  "/graphql",
];

const SKIP_ASSET = /\.(js|mjs|css|map|png|jpe?g|gif|svg|ico|woff2?|ttf|webp)(\?|$)/i;
const SKIP_PREFIX = /^\/(_next|static|assets|favicon|node_modules)\b/i;

const METHODS: NormalizedMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export class UnreachableTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnreachableTargetError";
  }
}

export interface DiscoveryResult {
  endpoints: NormalizedEndpoint[];
  source: "openapi" | "postman" | "probe";
  specUrl?: string;
  reachable: boolean;
}

type Fetched = {
  url: string;
  status: number;
  contentType: string;
  allow: string | null;
  text: string;
};

function joinUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = baseUrl.replace(/\/$/, "");
  const rel = path.startsWith("/") ? path : `/${path}`;
  return `${base}${rel}`;
}

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "169.254.169.254" || h.endsWith(".metadata.google.internal") || h === "metadata.google.internal";
}

function assertSafeUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnreachableTargetError("Base URL is not a valid http(s) address.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnreachableTargetError("Only http and https base URLs can be scanned.");
  }
  if (isBlockedHost(url.hostname)) {
    throw new UnreachableTargetError("That host cannot be scanned.");
  }
  return url;
}

type ProbeMethod = "GET" | "OPTIONS" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE";

async function fetchOnce(url: string, method: ProbeMethod, body?: string): Promise<Fetched | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/json, application/yaml, text/yaml, text/html;q=0.8, */*;q=0.5",
    };
    const writes = method === "POST" || method === "PUT" || method === "PATCH";
    if (writes) headers["Content-Type"] = "application/json";

    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_MS),
      headers,
      body: writes ? (body ?? "{}") : undefined,
    });
    const contentType = res.headers.get("content-type") ?? "";
    const allow = res.headers.get("allow");
    let text = "";
    if (method !== "HEAD") {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_BODY) return null;
      text = buf.toString("utf8");
    }
    return { url: res.url || url, status: res.status, contentType, allow, text };
  } catch {
    return null;
  }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
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

function tryParseSpec(text: string): ReturnType<typeof parseSpecDocument> | null {
  const attempts: unknown[] = [];
  try {
    attempts.push(JSON.parse(text));
  } catch {
    try {
      attempts.push(yaml.load(text));
    } catch {
      return null;
    }
  }
  for (const doc of attempts) {
    try {
      const parsed = parseSpecDocument(doc);
      if (parsed.endpoints.length > 0) return parsed;
    } catch (err) {
      if (!(err instanceof UnsupportedSpecError)) return null;
    }
  }
  return null;
}

function specUrlsFromUnknown(doc: unknown, pageUrl: string): string[] {
  if (!doc || typeof doc !== "object") return [];
  const rec = doc as Record<string, unknown>;
  const found: string[] = [];
  if (typeof rec.url === "string") found.push(joinUrl(pageUrl, rec.url));
  if (Array.isArray(rec.urls)) {
    for (const item of rec.urls) {
      if (typeof item === "string") found.push(joinUrl(pageUrl, item));
      else if (item && typeof item === "object" && typeof (item as { url?: string }).url === "string") {
        found.push(joinUrl(pageUrl, (item as { url: string }).url));
      }
    }
  }
  return found;
}

function specUrlsFromHtml(html: string, pageUrl: string): string[] {
  const urls = new Set<string>();
  const patterns = [
    /url:\s*["']([^"']+)["']/gi,
    /configUrl:\s*["']([^"']+)["']/gi,
    /["']([^"']*openapi[^"']*)["']/gi,
    /["']([^"']*swagger\.(json|yaml|yml)[^"']*)["']/gi,
    /["']([^"']*api-docs[^"']*)["']/gi,
    /href=["']([^"']*openapi[^"']*)["']/gi,
  ];
  for (const re of patterns) {
    for (const match of html.matchAll(re)) {
      const raw = match[1];
      if (!raw || SKIP_ASSET.test(raw)) continue;
      try {
        urls.add(joinUrl(pageUrl, raw));
      } catch {
        // ignore malformed
      }
    }
  }
  return [...urls];
}

export function extractCandidatePaths(text: string, origin: string): string[] {
  const paths = new Set<string>();
  const add = (raw: string) => {
    let path = raw.split(/[?#]/)[0];
    try {
      if (/^https?:\/\//i.test(path)) {
        const u = new URL(path);
        if (u.origin !== origin) return;
        path = u.pathname;
      }
    } catch {
      return;
    }
    if (!path.startsWith("/")) return;
    if (SKIP_ASSET.test(path) || SKIP_PREFIX.test(path)) return;
    if (path.length > 180) return;
    paths.add(path.replace(/\/$/, "") || "/");
  };

  for (const match of text.matchAll(
    /(?:fetch|axios)\(\s*['"`]([^'"`]+)['"`]/gi
  )) {
    add(match[1]);
  }
  for (const match of text.matchAll(
    /['"`](\/(?:api|v\d+|auth|users?|health|login|register|signup|token|me|projects?|items?|orders?|products?)[^'"`]*)['"`]/gi
  )) {
    add(match[1]);
  }
  return [...paths];
}

function parseAllow(header: string | null): NormalizedMethod[] {
  if (!header) return [];
  const found: NormalizedMethod[] = [];
  for (const part of header.split(",")) {
    const m = part.trim().toUpperCase() as NormalizedMethod;
    if (METHODS.includes(m)) found.push(m);
  }
  return [...new Set(found)];
}

function expressMissingRoute(fetched: Fetched): boolean {
  if (fetched.status !== 404) return false;
  if (looksJson(fetched.contentType, fetched.text)) return false;
  return (
    /cannot\s+(get|post|put|patch|delete|head|options)/i.test(fetched.text) ||
    looksHtml(fetched.contentType, fetched.text)
  );
}

function isApiLike(fetched: Fetched): boolean {
  if (fetched.status === 502 || fetched.status === 503) return false;
  if (expressMissingRoute(fetched)) return false;
  if (looksHtml(fetched.contentType, fetched.text) && fetched.status < 400) return false;
  if ([400, 401, 403, 404, 405, 409, 415, 422, 204].includes(fetched.status)) {
    return looksJson(fetched.contentType, fetched.text) || fetched.status !== 404;
  }
  if (fetched.status >= 200 && fetched.status < 500 && looksJson(fetched.contentType, fetched.text)) return true;
  if (parseAllow(fetched.allow).length > 0) return true;
  return false;
}

function jsonArray(text: string): unknown[] | null {
  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

function sampleRecordId(rows: unknown[]): string | null {
  const first = rows[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) return null;
  const rec = first as Record<string, unknown>;
  if (rec.id != null) return String(rec.id);
  if (rec._id != null) return String(rec._id);
  return null;
}

function probedEndpoint(
  method: NormalizedMethod,
  path: string,
  status: number
): NormalizedEndpoint {
  const requiresAuth = status === 401 || status === 403;
  const documented =
    status >= 200 && status < 500 ? [status, 200, 401, 404].filter((n, i, a) => a.indexOf(n) === i) : [200, 401, 404];
  return {
    name: `${method} ${path}`,
    method,
    path,
    expectedStatus: status >= 200 && status < 300 ? status : 200,
    documentedStatuses: documented,
    requiresAuth,
  };
}

async function loadSpecFromUrl(url: string): Promise<{
  parsed: ReturnType<typeof parseSpecDocument>;
  specUrl: string;
} | null> {
  const fetched = await fetchOnce(url, "GET");
  if (!fetched || fetched.status >= 400 || !fetched.text) return null;

  const spec = tryParseSpec(fetched.text);
  if (spec) return { parsed: spec, specUrl: fetched.url };

  try {
    const extra = specUrlsFromUnknown(JSON.parse(fetched.text), fetched.url);
    for (const next of extra) {
      if (next === url) continue;
      const nested = await fetchOnce(next, "GET");
      if (!nested?.text) continue;
      const nestedSpec = tryParseSpec(nested.text);
      if (nestedSpec) return { parsed: nestedSpec, specUrl: nested.url };
    }
  } catch {
    // not swagger-config JSON
  }
  return null;
}

async function pingOrigin(origin: string): Promise<boolean> {
  const hits = await Promise.all([
    fetchOnce(origin + "/", "GET"),
    fetchOnce(origin + "/health", "GET"),
    fetchOnce(origin + "/openapi.json", "GET"),
  ]);
  return hits.some((h) => h !== null);
}

async function resolveOrigin(baseUrl: string): Promise<string> {
  const url = assertSafeUrl(baseUrl);
  const origin = url.origin;
  if (await pingOrigin(origin)) return origin;

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "::1") {
    const alt = `${url.protocol}//127.0.0.1${url.port ? `:${url.port}` : ""}`;
    if (await pingOrigin(alt)) return alt;
  }

  throw new UnreachableTargetError(
    `Nothing is listening at ${origin}. Start the API and use that process’s URL (for example http://localhost:4000, not the frontend).`
  );
}

export async function discoverEndpoints(baseUrl: string): Promise<DiscoveryResult> {
  const origin = await resolveOrigin(baseUrl);

  const specCandidates = SPEC_PATHS.map((p) => joinUrl(origin, p));
  const specHits = await mapPool(specCandidates, 8, (u) => loadSpecFromUrl(u));
  const spec = specHits.find((s) => s !== null);
  if (spec) {
    return {
      endpoints: spec.parsed.endpoints,
      source: spec.parsed.format,
      specUrl: spec.specUrl,
      reachable: true,
    };
  }

  const htmlPages = await mapPool(
    DOCS_PAGES.map((p) => joinUrl(origin, p)),
    6,
    (u) => fetchOnce(u, "GET")
  );
  const htmlUrls: string[] = [];
  const candidatePaths = new Set<string>(PROBE_PATHS);
  for (const page of htmlPages) {
    if (!page?.text) continue;
    if (looksHtml(page.contentType, page.text)) {
      htmlUrls.push(...specUrlsFromHtml(page.text, page.url));
      for (const path of extractCandidatePaths(page.text, origin)) candidatePaths.add(path);
    } else {
      const parsed = tryParseSpec(page.text);
      if (parsed) {
        return { endpoints: parsed.endpoints, source: parsed.format, specUrl: page.url, reachable: true };
      }
    }
  }

  for (const extra of [...new Set(htmlUrls)].slice(0, 15)) {
    const loaded = await loadSpecFromUrl(extra);
    if (loaded) {
      return {
        endpoints: loaded.parsed.endpoints,
        source: loaded.parsed.format,
        specUrl: loaded.specUrl,
        reachable: true,
      };
    }
  }

  const paths = [...candidatePaths].slice(0, 50);
  const probes = await mapPool(paths, 8, async (path) => {
    const url = joinUrl(origin, path);
    const options = await fetchOnce(url, "OPTIONS");
    const get = await fetchOnce(url, "GET");
    return { path, options, get };
  });

  const found = new Map<string, NormalizedEndpoint>();
  for (const row of probes) {
    const allow = parseAllow(row.options?.allow ?? row.get?.allow ?? null);
    const get = row.get;
    if (allow.length > 0) {
      for (const method of allow) {
        const key = `${method} ${row.path}`;
        found.set(key, probedEndpoint(method, row.path, get?.status ?? 200));
      }
      continue;
    }
    if (get && isApiLike(get)) {
      found.set(`GET ${row.path}`, probedEndpoint("GET", row.path, get.status));
    }
  }

  // A GET that returns a JSON list is almost always a REST collection.
  // Confirm POST /resource and GET|PATCH|PUT|DELETE /resource/{id} without
  // deleting real rows (writes use {} or a missing id).
  const collections = [...found.values()].filter(
    (ep) => ep.method === "GET" && ep.path !== "/" && !/\{[^}]+\}/.test(ep.path)
  );
  for (const col of collections) {
    const getRow = probes.find((p) => p.path === col.path)?.get;
    const rows = getRow ? jsonArray(getRow.text) : null;
    if (!getRow || !rows) continue;

    const itemPath = `${col.path.replace(/\/$/, "")}/{id}`;
    const sampleId = sampleRecordId(rows) ?? "999999";
    const checks: { method: NormalizedMethod; path: string; urlPath: string; body?: string }[] = [
      { method: "POST", path: col.path, urlPath: col.path, body: "{}" },
      { method: "GET", path: itemPath, urlPath: `${col.path}/${sampleId}` },
      { method: "PATCH", path: itemPath, urlPath: `${col.path}/999999`, body: "{}" },
      { method: "PUT", path: itemPath, urlPath: `${col.path}/999999`, body: "{}" },
      { method: "DELETE", path: itemPath, urlPath: `${col.path}/999999` },
    ];

    for (const check of checks) {
      const key = `${check.method} ${check.path}`;
      if (found.has(key)) continue;
      const hit = await fetchOnce(joinUrl(origin, check.urlPath), check.method, check.body);
      if (hit && isApiLike(hit)) {
        found.set(key, probedEndpoint(check.method, check.path, hit.status));
      }
    }
  }

  const endpoints = [...found.values()];
  if (endpoints.length === 0) {
    return { endpoints: [], source: "probe", reachable: true };
  }
  return { endpoints, source: "probe", reachable: true };
}
