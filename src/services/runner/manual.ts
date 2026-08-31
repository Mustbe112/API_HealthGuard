import { joinUrl } from "./requestBuilder";
import { BuiltRequest } from "./requestBuilder";

const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

export function applyPathParams(template: string, params: Record<string, string>): string {
  const filled = template
    .replace(/\{([^}]+)\}/g, (_, key: string) => encodeURIComponent(params[key] ?? ""))
    .replace(/\/:([^/?#]+)/g, (_, key: string) => `/${encodeURIComponent(params[key] ?? "")}`);

  if (filled.includes("://") || filled.startsWith("//")) {
    throw new Error("Path must stay relative to this project's base URL");
  }
  return filled;
}

export function appendQuery(url: string, query: Record<string, string>): string {
  const entries = Object.entries(query).filter(([, v]) => v !== "");
  if (entries.length === 0) return url;
  const qs = new URLSearchParams(entries).toString();
  return `${url}${url.includes("?") ? "&" : "?"}${qs}`;
}

export function assertSameOrigin(url: string, baseUrl: string) {
  let target: URL;
  let base: URL;
  try {
    target = new URL(url);
    base = new URL(baseUrl);
  } catch {
    throw new Error("Invalid URL");
  }
  if (target.origin !== base.origin) {
    throw new Error("Request must stay on this project's base URL");
  }
}

export function buildManualRequest(input: {
  baseUrl: string;
  method: string;
  pathTemplate: string;
  pathParams: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string>;
  body?: string;
  bearerToken?: string;
}): BuiltRequest {
  const path = applyPathParams(input.pathTemplate, input.pathParams);
  const url = appendQuery(joinUrl(input.baseUrl, path), input.query);
  assertSameOrigin(url, input.baseUrl);

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.headers)) {
    if (!key.trim()) continue;
    if (key.toLowerCase() === "host") continue;
    headers[key] = value;
  }

  const hasBody = BODY_METHODS.has(input.method.toUpperCase()) && Boolean(input.body);
  if (hasBody && !Object.keys(headers).some((k) => k.toLowerCase() === "content-type")) {
    headers["Content-Type"] = "application/json";
  }

  if (input.bearerToken) {
    headers["Authorization"] = `Bearer ${input.bearerToken}`;
  }

  return {
    url,
    method: input.method.toUpperCase(),
    headers,
    body: hasBody ? input.body : undefined,
  };
}
