import yaml from "js-yaml";
import { NormalizedEndpoint } from "./types";
import { looksLikeOpenApi, parseOpenApi } from "./openapi.parser";
import { looksLikePostmanCollection, parsePostmanCollection } from "./postman.parser";

export class UnsupportedSpecError extends Error {}

function parseRawFile(buffer: Buffer, filename: string): any {
  const text = buffer.toString("utf8");
  const isYaml = /\.ya?ml$/i.test(filename);

  if (isYaml) {
    return yaml.load(text);
  }

  // Try JSON first regardless of extension — some people upload OpenAPI
  // YAML with a .json extension by mistake, and vice versa is rare but
  // cheap to guard against too.
  try {
    return JSON.parse(text);
  } catch {
    return yaml.load(text);
  }
}

export function parseSpecDocument(
  doc: unknown
): { endpoints: NormalizedEndpoint[]; format: "openapi" | "postman"; serverUrl?: string } {
  if (looksLikeOpenApi(doc)) {
    return { endpoints: parseOpenApi(doc), format: "openapi", serverUrl: openApiServerUrl(doc) };
  }

  if (looksLikePostmanCollection(doc)) {
    return { endpoints: parsePostmanCollection(doc), format: "postman" };
  }

  throw new UnsupportedSpecError(
    "File is not a recognized OpenAPI (openapi/swagger + paths) or Postman Collection v2.x export."
  );
}

export function parseSpecText(text: string, filename = "spec.json") {
  return parseSpecFile(Buffer.from(text, "utf8"), filename);
}

export function parseSpecFile(
  buffer: Buffer,
  filename: string
): { endpoints: NormalizedEndpoint[]; format: "openapi" | "postman"; serverUrl?: string } {
  return parseSpecDocument(parseRawFile(buffer, filename));
}

function openApiServerUrl(doc: any): string | undefined {
  const fromServers = doc?.servers?.[0]?.url;
  if (typeof fromServers === "string" && /^https?:\/\//i.test(fromServers)) {
    return fromServers.replace(/\/$/, "");
  }
  if (typeof doc?.host === "string") {
    const scheme = Array.isArray(doc.schemes) && doc.schemes[0] ? String(doc.schemes[0]) : "https";
    const basePath = typeof doc.basePath === "string" ? doc.basePath : "";
    return `${scheme}://${doc.host}${basePath}`.replace(/\/$/, "");
  }
  return undefined;
}
