export type NormalizedMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export interface NormalizedEndpoint {
  name: string;
  method: NormalizedMethod;
  path: string; // relative, e.g. "/users/{id}"
  expectedStatus: number;
  /** Every status the spec documents for this operation (excluding 5xx). */
  documentedStatuses: number[];
  /** True when the spec declares security, or documents 401/403. */
  requiresAuth: boolean;
  requestSchema?: unknown;
  responseSchema?: unknown;
  headers?: Record<string, string>;
}
