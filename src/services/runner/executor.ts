import { BuiltRequest } from "./requestBuilder";
import {
  ProbeKind,
  asStatusList,
  brokenMessage,
  isWorking,
  workingMessage,
} from "./zeroInput";
import { classifyOutcome, manualMessage } from "./outcome";

export interface RequestSnapshot {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export interface ExecutionResult {
  statusCode: number | null;
  responseTimeMs: number | null;
  responseBody: unknown;
  responseHeaders?: Record<string, string>;
  passed: boolean;
  errorMessage: string | null;
  request?: RequestSnapshot;
}

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] = key.toLowerCase() === "authorization" ? "Bearer ••••••••" : value;
  }
  return out;
}

export function redactBody(body?: string): string | undefined {
  if (!body) return body;
  try {
    const obj = JSON.parse(body) as Record<string, unknown>;
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      for (const key of Object.keys(obj)) {
        if (key.toLowerCase().includes("pass")) obj[key] = "••••••••";
      }
      return JSON.stringify(obj);
    }
  } catch {
    // keep raw
  }
  return body;
}

export function snapshotRequest(built: BuiltRequest): RequestSnapshot {
  return {
    url: built.url,
    method: built.method,
    headers: redactHeaders(built.headers),
    body: redactBody(built.body),
  };
}

/** A "skipped" result for write-method requests when dryRun is enabled —
 * no request is sent, and the result is excluded from pass/fail totals. */
export function skippedResult(): ExecutionResult {
  return {
    statusCode: null,
    responseTimeMs: null,
    responseBody: null,
    passed: true,
    errorMessage: "Skipped (dry run — write request not sent)",
  };
}

async function safeParseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function headerMap(res: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

export async function executeRequest(
  built: BuiltRequest,
  documentedStatuses: number[],
  probeKind: ProbeKind,
  pathForExplain = ""
): Promise<ExecutionResult> {
  const startedAt = performance.now();
  const request = snapshotRequest(built);

  let res: Response;
  try {
    res = await fetch(built.url, {
      method: built.method,
      headers: built.headers,
      body: built.body,
    });
  } catch (err: any) {
    return {
      statusCode: null,
      responseTimeMs: Math.round(performance.now() - startedAt),
      responseBody: null,
      passed: false,
      errorMessage: `Request failed: ${err.message ?? "unknown network error"}`,
      request,
    };
  }

  const responseTimeMs = Math.round(performance.now() - startedAt);
  const responseBody = await safeParseBody(res);
  const documented =
    documentedStatuses.length > 0 ? documentedStatuses : asStatusList(null, 200);
  const passed = isWorking(res.status, documented, probeKind);
  const outcome = classifyOutcome({ passed, statusCode: res.status });
  const errorMessage =
    outcome === "working"
      ? workingMessage(res.status, documented)
      : outcome === "manual"
        ? manualMessage(res.status)
        : brokenMessage(res.status, documented, probeKind, pathForExplain || built.url);

  return {
    statusCode: res.status,
    responseTimeMs,
    responseBody,
    responseHeaders: headerMap(res),
    passed,
    errorMessage,
    request,
  };
}

/** Manual "Try it" send — no pass/fail against the spec, just the response. */
export async function executeManual(built: BuiltRequest): Promise<ExecutionResult> {
  const startedAt = performance.now();
  const request = snapshotRequest(built);

  let res: Response;
  try {
    res = await fetch(built.url, {
      method: built.method,
      headers: built.headers,
      body: built.body,
    });
  } catch (err: any) {
    return {
      statusCode: null,
      responseTimeMs: Math.round(performance.now() - startedAt),
      responseBody: null,
      passed: false,
      errorMessage: `Request failed: ${err.message ?? "unknown network error"}`,
      request,
    };
  }

  return {
    statusCode: res.status,
    responseTimeMs: Math.round(performance.now() - startedAt),
    responseBody: await safeParseBody(res),
    responseHeaders: headerMap(res),
    passed: true,
    errorMessage: null,
    request,
  };
}
