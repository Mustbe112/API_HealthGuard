/**
 * Zero-input testing: the engine generates a throwaway account, a random
 * UUID for every path param, and an empty body for writes. An endpoint is
 * "working" when the status is one the spec documents (or the graceful
 * status that probe is designed to elicit) — not only 200 OK. 5xx is
 * always broken.
 */

export type ProbeKind =
  | "register"
  | "health"
  | "fake-id"
  | "unauthenticated"
  | "empty-body"
  | "authenticated-read";

export interface Probe {
  kind: ProbeKind;
  sendAuth: boolean;
  sendEmptyBody: boolean;
  fillPathParams: boolean;
  sent: string;
  proves: string;
  expected: number[];
}

export interface ProbeRecord {
  sent: string;
  expected: number[];
  proves: string;
  caution?: string;
  request?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  };
}

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

const REGISTER_PATH = /\/(auth\/)?(register|signup)\/?$/i;
const LOGIN_PATH = /\/(auth\/)?(login|signin|token)\/?$/i;
const HEALTH_PATH = /health|ready|live|ping/i;

export function normalizePath(path: string): string {
  const trimmed = path.replace(/\/$/, "");
  return trimmed.length > 0 ? trimmed : "/";
}

export function isRegisterEndpoint(ep: { method: string; path: string }): boolean {
  return ep.method === "POST" && REGISTER_PATH.test(normalizePath(ep.path));
}

export function isLoginEndpoint(ep: { method: string; path: string }): boolean {
  return ep.method === "POST" && LOGIN_PATH.test(normalizePath(ep.path));
}

export function pathHasParams(path: string): boolean {
  return /\{[^}]+\}|\/:[\w-]+/.test(path);
}

export function asStatusList(value: unknown, fallback: number): number[] {
  if (Array.isArray(value) && value.every((n) => typeof n === "number")) {
    const filtered = value.filter((n) => n < 500);
    if (filtered.length > 0) return filtered;
  }
  return [fallback];
}

export function formatExpected(codes: number[]): string {
  if (codes.length === 0) return "a non-5xx response";
  if (codes.length === 1) return String(codes[0]);
  if (codes.length === 2) return `${codes[0]} or ${codes[1]}`;
  return `${codes.slice(0, -1).join(", ")}, or ${codes[codes.length - 1]}`;
}

function uniqueCodes(...groups: number[][]): number[] {
  return [...new Set(groups.flat())].sort((a, b) => a - b);
}

export function planProbes(
  ep: {
    method: string;
    path: string;
    expectedStatus: number;
    documentedStatuses: unknown;
    requiresAuth: boolean;
  },
  hasToken: boolean
): Probe[] {
  const documented = asStatusList(ep.documentedStatuses, ep.expectedStatus);
  const requiresAuth =
    ep.requiresAuth ||
    documented.includes(401) ||
    documented.includes(403) ||
    // A throwaway token means the API has auth; assume non-health routes may need it
    // even when the spec forgot to declare security / 401.
    (hasToken && !HEALTH_PATH.test(ep.path));
  const hasParams = pathHasParams(ep.path);
  const hasBody = BODY_METHODS.has(ep.method);
  const isWrite = WRITE_METHODS.has(ep.method);
  const probes: Probe[] = [];

  if (isRegisterEndpoint(ep) || isLoginEndpoint(ep)) {
    // Bootstrap already exercised register with a real body. A leftover
    // probe (login, or register when bootstrap didn't run) sends garbage
    // to confirm the handler still validates.
    probes.push({
      kind: "empty-body",
      sendAuth: false,
      sendEmptyBody: true,
      fillPathParams: false,
      sent: "Empty body",
      proves: "Handler runs, validation logic intact",
      expected: uniqueCodes(documented, [400, 422, 200, 201]),
    });
    return probes;
  }

  if (isWrite && requiresAuth) {
    probes.push({
      kind: "unauthenticated",
      sendAuth: false,
      sendEmptyBody: hasBody,
      fillPathParams: hasParams,
      sent: hasParams ? "Random fake UUID, no token" : "No token",
      proves: "Route deployed, auth middleware active",
      expected: uniqueCodes(documented, [401, 403]),
    });
  }

  if (hasBody && (hasToken || !requiresAuth)) {
    probes.push({
      kind: "empty-body",
      sendAuth: Boolean(hasToken && requiresAuth),
      sendEmptyBody: true,
      fillPathParams: hasParams,
      sent: hasToken && requiresAuth ? "Valid token, empty body" : "Empty body",
      proves: "Handler runs, validation logic intact",
      expected: uniqueCodes(documented, [400, 422]),
    });
  } else if (hasParams && !hasBody) {
    probes.push({
      kind: "fake-id",
      sendAuth: Boolean(hasToken && requiresAuth),
      sendEmptyBody: false,
      fillPathParams: true,
      sent: "A random fake UUID",
      proves: isWrite
        ? "Same as above — never needs a real record"
        : "Route exists, handles missing data gracefully",
      expected: uniqueCodes(documented, [200, 404]),
    });
  } else if (HEALTH_PATH.test(ep.path)) {
    probes.push({
      kind: "health",
      sendAuth: false,
      sendEmptyBody: false,
      fillPathParams: false,
      sent: "Nothing",
      proves: "Server + DB are alive",
      expected: uniqueCodes(documented, [200]),
    });
  } else if (!isWrite) {
    probes.push({
      kind: "authenticated-read",
      sendAuth: Boolean(hasToken && requiresAuth),
      sendEmptyBody: false,
      fillPathParams: false,
      sent: hasToken && requiresAuth ? "Auto-created throwaway token" : "Nothing",
      proves:
        hasToken && requiresAuth
          ? "Full read path + auth + DB query all work"
          : "Route exists and responds",
      expected: uniqueCodes(documented, [200]),
    });
  }

  return probes;
}

export interface ThrowawayCredentials {
  email: string;
  password: string;
  username: string;
  name: string;
}

export function generateThrowawayCredentials(): ThrowawayCredentials {
  const short = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  return {
    email: `zeroinput.${short}@example.test`,
    password: `Zi_${short}Aa1!`,
    username: `zi_${short}`,
    name: "Zero Input",
  };
}

/** Builds a register/login body from the spec's request schema when we
 * can, falling back to common field names so this works on typical auth
 * routes without the user typing anything. */
export function bodyFromSchema(
  schema: unknown,
  creds: ThrowawayCredentials
): Record<string, unknown> {
  const fallback: Record<string, unknown> = {
    email: creds.email,
    password: creds.password,
    username: creds.username,
    name: creds.name,
  };

  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return fallback;
  }

  const s = schema as { properties?: Record<string, { type?: string }>; required?: string[] };
  const props = s.properties ?? {};
  const keys = s.required?.length ? s.required : Object.keys(props).length ? Object.keys(props) : Object.keys(fallback);

  if (keys.length === 0) return fallback;

  const body: Record<string, unknown> = {};
  for (const key of keys) {
    const lower = key.toLowerCase();
    if (lower.includes("email")) body[key] = creds.email;
    else if (lower.includes("pass")) body[key] = creds.password;
    else if (lower === "name" || lower.includes("fullname") || lower.includes("display")) {
      body[key] = creds.name;
    } else if (lower.includes("user") || lower.includes("login")) {
      body[key] = creds.username;
    } else {
      const type = props[key]?.type;
      if (type === "number" || type === "integer") body[key] = 1;
      else if (type === "boolean") body[key] = true;
      else if (type === "array") body[key] = [];
      else if (type === "object") body[key] = {};
      else body[key] = creds.username;
    }
  }

  return Object.keys(body).length > 0 ? body : fallback;
}

export function extractToken(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;

  const looksLikeToken = (value: unknown): value is string => {
    if (typeof value !== "string" || value.length < 8) return false;
    if (value.split(".").length === 3) return true;
    return /^[A-Za-z0-9_-]{12,}$/.test(value);
  };

  const walk = (obj: Record<string, unknown>, depth: number): string | null => {
    if (depth > 4) return null;
    for (const key of ["access_token", "accessToken", "token", "jwt", "idToken", "id_token"]) {
      const value = obj[key];
      if (looksLikeToken(value)) return value;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const nested = value as Record<string, unknown>;
        for (const inner of ["access", "accessToken", "access_token", "jwt"]) {
          if (looksLikeToken(nested[inner])) return nested[inner] as string;
        }
      }
    }
    for (const value of Object.values(obj)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const found = walk(value as Record<string, unknown>, depth + 1);
        if (found) return found;
      }
    }
    return null;
  };

  return walk(body as Record<string, unknown>, 0);
}

/**
 * Working = the status is one the spec documents, or the graceful status
 * this probe is *meant* to elicit (401 without a token, 400 on an empty
 * body, 404 on a fake id). 5xx is always broken. An authenticated read
 * that still returns 401 means the throwaway token didn't land, so that's
 * broken too.
 */
export function isWorking(status: number, documented: number[], kind: ProbeKind): boolean {
  if (status >= 500) return false;

  if (kind === "authenticated-read" && (status === 401 || status === 403)) {
    return false;
  }

  if (documented.includes(status)) return true;

  switch (kind) {
    case "unauthenticated":
      return status === 401 || status === 403;
    case "empty-body":
      return (
        status === 400 ||
        status === 401 ||
        status === 403 ||
        status === 415 ||
        status === 422 ||
        status === 404
      );
    case "fake-id":
      return (
        status === 200 ||
        status === 204 ||
        status === 400 ||
        status === 401 ||
        status === 403 ||
        status === 404
      );
    case "health":
      return status === 200;
    case "authenticated-read":
      return status >= 200 && status < 300;
    case "register":
      return (status >= 200 && status < 300) || status === 409;
    default:
      return status >= 200 && status < 300;
  }
}

export function workingMessage(status: number, expected: number[]): string {
  return `Got ${status} — matches documented responses (${formatExpected(expected)})`;
}

export function brokenMessage(
  status: number | null,
  expected: number[],
  kind: ProbeKind,
  path: string
): string {
  if (status === null) {
    return "No response — the server didn't answer. Check the base URL and that the API is running.";
  }
  if (status >= 500) {
    return `The handler crashed with ${status}. The route exists but threw an error (expected ${formatExpected(expected)}).`;
  }
  if (status === 404 && (kind === "health" || kind === "register" || !pathHasParams(path))) {
    return `${path} returned 404, so this path is probably not deployed or the project base URL is wrong. The spec expected ${formatExpected(expected)}.`;
  }
  if ((status === 401 || status === 403) && kind === "authenticated-read") {
    return "A token was sent but the server still rejected it. Register may have failed, or this route uses a different auth scheme.";
  }
  if (status === 404 && kind === "empty-body") {
    return `Got 404 on ${path} — this write route may not be deployed. Expected ${formatExpected(expected)}.`;
  }
  return `Got ${status}, which isn't what this probe expected (${formatExpected(expected)}).`;
}

/** Spec-documented 404 on a route with no `{id}` often means "missing path", not "missing record". */
export function cautionForResult(
  status: number | null,
  path: string,
  passed: boolean
): string | undefined {
  if (!passed || status !== 404) return undefined;
  if (pathHasParams(path)) return undefined;
  return "Spec allows 404, but on a route with no id this often means the path isn't deployed. Check the base URL.";
}
