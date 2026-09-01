import { NormalizedEndpoint, NormalizedMethod } from "./types";

const HTTP_METHODS: NormalizedMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

/** Quick structural check — true for OpenAPI 3.x and Swagger 2.0 docs. */
export function looksLikeOpenApi(doc: any): boolean {
  return Boolean(doc && (doc.openapi || doc.swagger) && doc.paths);
}

/** Resolves a JSON Pointer like "#/components/schemas/Pet" against the doc. */
function resolvePointer(doc: any, ref: string): any {
  if (!ref.startsWith("#/")) return undefined;
  const parts = ref
    .slice(2)
    .split("/")
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));
  let node = doc;
  for (const part of parts) {
    if (node == null) return undefined;
    node = node[part];
  }
  return node;
}

/** Recursively inlines $ref pointers so the stored schema is self-contained
 * (Ajv can't resolve "#/components/schemas/X" without the full document).
 * Cycle guard: if a $ref is encountered again while already expanding it,
 * stop expanding further and allow anything at that point (`true`) rather
 * than recursing forever — self-referential schemas (e.g. a tree node
 * with children of the same type) are common and shouldn't crash parsing. */
function dereference(doc: any, node: any, seenRefs: Set<string>): any {
  if (node === null || typeof node !== "object") return node;

  if (Array.isArray(node)) {
    return node.map((item) => dereference(doc, item, seenRefs));
  }

  if (typeof node.$ref === "string") {
    const ref = node.$ref;
    if (seenRefs.has(ref)) return true; // cycle guard
    const target = resolvePointer(doc, ref);
    if (target === undefined) return node; // unresolvable, leave as-is
    return dereference(doc, target, new Set([...seenRefs, ref]));
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(node)) {
    result[key] = dereference(doc, value, seenRefs);
  }
  return result;
}

function dereferenceSchema(doc: any, schema: unknown): unknown {
  if (!schema) return schema;
  try {
    return dereference(doc, schema, new Set());
  } catch {
    return schema; // fall back to the un-dereferenced schema rather than fail parsing
  }
}

const GRACEFUL_4XX = [400, 401, 403, 404, 409, 422];
const GRACEFUL_2XX = [200, 201, 202, 204];

/** Collects every concrete (non-5xx) status the spec documents, expanding
 * 2XX / 4XX wildcards into the statuses zero-input testing actually uses. */
export function documentedStatusesFromResponses(
  responses: Record<string, any> | undefined
): number[] {
  if (!responses) return [200];

  const statuses = new Set<number>();
  for (const key of Object.keys(responses)) {
    if (/^\d{3}$/.test(key)) {
      const code = Number(key);
      if (code < 500) statuses.add(code);
      continue;
    }
    const upper = key.toUpperCase();
    if (upper === "2XX") GRACEFUL_2XX.forEach((c) => statuses.add(c));
    if (upper === "4XX") GRACEFUL_4XX.forEach((c) => statuses.add(c));
  }

  return statuses.size > 0 ? [...statuses].sort((a, b) => a - b) : [200];
}

function firstSuccessResponse(
  doc: any,
  responses: Record<string, any> | undefined
): {
  status: number;
  schema?: unknown;
} {
  if (!responses) return { status: 200 };

  const codes = Object.keys(responses).filter((c) => /^2\d\d$/.test(c));
  const code = codes[0];
  if (!code) return { status: 200 };

  const content = responses[code]?.content;
  const schema =
    content?.["application/json"]?.schema ??
    (content ? (Object.values(content)[0] as any) : undefined)?.schema;

  return { status: Number(code), schema: dereferenceSchema(doc, schema) };
}

/** Empty `security: []` is explicitly public. Otherwise inherit operation →
 * path → root. If the spec never declares security but documents 401/403,
 * treat the route as protected. */
function operationRequiresAuth(doc: any, pathItem: any, operation: any): boolean {
  for (const sec of [operation.security, pathItem.security, doc.security]) {
    if (sec === undefined) continue;
    if (!Array.isArray(sec)) continue;
    if (sec.length === 0) return false;
    return sec.some((s) => s && Object.keys(s).length > 0);
  }
  return Boolean(operation.responses?.["401"] || operation.responses?.["403"]);
}

function requestBodySchema(doc: any, requestBody: any): unknown {
  if (!requestBody?.content) return undefined;
  const content = requestBody.content;
  const schema =
    content["application/json"]?.schema ?? (Object.values(content)[0] as any)?.schema;
  return dereferenceSchema(doc, schema);
}

export function parseOpenApi(doc: any): NormalizedEndpoint[] {
  const endpoints: NormalizedEndpoint[] = [];
  const paths = doc.paths ?? {};

  for (const [path, pathItem] of Object.entries<any>(paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method.toLowerCase()];
      if (!operation) continue;

      const { status, schema: responseSchema } = firstSuccessResponse(
        doc,
        operation.responses
      );

      endpoints.push({
        name: operation.summary || operation.operationId || `${method} ${path}`,
        method,
        path,
        expectedStatus: status,
        documentedStatuses: documentedStatusesFromResponses(operation.responses),
        requiresAuth: operationRequiresAuth(doc, pathItem, operation),
        requestSchema: requestBodySchema(doc, operation.requestBody),
        responseSchema,
      });
    }
  }

  return endpoints;
}
