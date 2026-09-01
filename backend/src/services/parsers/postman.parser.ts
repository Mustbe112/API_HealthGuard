import { NormalizedEndpoint, NormalizedMethod } from "./types";

/** Quick structural check — true for Postman Collection v2.x exports. */
export function looksLikePostmanCollection(doc: any): boolean {
  return Boolean(doc?.info?.schema?.includes("collection") && Array.isArray(doc.item));
}

function extractPath(url: any): string {
  if (!url) return "/";

  // Prefer the structured `path` array — it avoids the base URL/variable
  // that's usually embedded in `raw` (e.g. "{{base_url}}/users/123").
  if (Array.isArray(url.path)) {
    return "/" + url.path.join("/");
  }

  if (typeof url === "string") {
    // Strip a leading {{variable}} or protocol+host if present.
    const withoutVar = url.replace(/^\{\{[^}]+\}\}/, "");
    try {
      const parsed = new URL(withoutVar.startsWith("http") ? withoutVar : `http://placeholder${withoutVar}`);
      return parsed.pathname;
    } catch {
      return withoutVar.startsWith("/") ? withoutVar : `/${withoutVar}`;
    }
  }

  return "/";
}

function extractHeaders(headerArray: any[] | undefined): Record<string, string> | undefined {
  if (!Array.isArray(headerArray) || headerArray.length === 0) return undefined;
  const headers: Record<string, string> = {};
  for (const h of headerArray) {
    if (h?.disabled) continue;
    if (typeof h?.key === "string") headers[h.key] = h.value ?? "";
  }
  return Object.keys(headers).length > 0 ? headers : undefined;
}

function extractRequestBody(body: any): unknown {
  if (!body) return undefined;
  if (body.mode === "raw" && typeof body.raw === "string") {
    try {
      return JSON.parse(body.raw);
    } catch {
      return body.raw; // not valid JSON, keep as raw string example
    }
  }
  if (body.mode === "urlencoded" && Array.isArray(body.urlencoded)) {
    return Object.fromEntries(body.urlencoded.map((p: any) => [p.key, p.value]));
  }
  return undefined;
}

function expectedStatusFromExamples(responses: any[] | undefined): number {
  const first = responses?.[0];
  return typeof first?.code === "number" ? first.code : 200;
}

function documentedStatusesFromExamples(responses: any[] | undefined): number[] {
  const codes = (responses ?? [])
    .map((r) => r?.code)
    .filter((c: unknown): c is number => typeof c === "number" && c < 500);
  const unique = [...new Set(codes)];
  return unique.length > 0 ? unique.sort((a, b) => a - b) : [200];
}

function headersImplyAuth(headers: Record<string, string> | undefined): boolean {
  if (!headers) return false;
  return Object.keys(headers).some((k) => k.toLowerCase() === "authorization");
}

const VALID_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

/** Recursively walks Postman's nested folder structure (item can contain
 * either a request or a nested item[] representing a folder). */
function walkItems(items: any[], prefix = ""): NormalizedEndpoint[] {
  const endpoints: NormalizedEndpoint[] = [];

  for (const item of items ?? []) {
    if (Array.isArray(item.item)) {
      // It's a folder — recurse, carrying the folder name for context.
      endpoints.push(...walkItems(item.item, `${prefix}${item.name}/`));
      continue;
    }

    const request = item.request;
    if (!request) continue;

    const method = String(request.method ?? "GET").toUpperCase();
    if (!VALID_METHODS.has(method)) continue;

    const headers = extractHeaders(request.header);
    endpoints.push({
      name: `${prefix}${item.name}`,
      method: method as NormalizedMethod,
      path: extractPath(request.url),
      expectedStatus: expectedStatusFromExamples(item.response),
      documentedStatuses: documentedStatusesFromExamples(item.response),
      requiresAuth: headersImplyAuth(headers),
      requestSchema: extractRequestBody(request.body),
      headers,
    });
  }

  return endpoints;
}

export function parsePostmanCollection(doc: any): NormalizedEndpoint[] {
  return walkItems(doc.item ?? []);
}
