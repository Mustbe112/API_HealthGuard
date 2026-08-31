export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  baseUrl: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  endpoints?: Endpoint[];
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface Endpoint {
  id: string;
  projectId: string;
  name: string;
  method: HttpMethod;
  path: string;
  expectedStatus: number;
  documentedStatuses?: number[] | null;
  requiresAuth?: boolean;
  requestSchema?: unknown;
  headers?: Record<string, string> | null;
  dependsOnId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequestSnapshot {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export interface ProbeMeta {
  sent: string;
  expected: number[];
  proves: string;
  caution?: string;
  request?: RequestSnapshot;
}

export type TestRunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface TestResult {
  id: string;
  testRunId: string;
  endpointId: string;
  statusCode: number | null;
  responseTimeMs: number | null;
  passed: boolean;
  errorMessage: string | null;
  responseBody?: unknown;
  probe?: ProbeMeta | null;
  createdAt: string;
  endpoint: Endpoint;
}

export interface TestRun {
  id: string;
  projectId: string;
  status: TestRunStatus;
  dryRun: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  workingCount?: number;
  brokenCount?: number;
  skippedCount?: number;
  manualCount?: number;
  results?: TestResult[];
}

export interface EnvVariable {
  id: string;
  key: string;
  isSecret: boolean;
  value?: string;
  updatedAt: string;
}

export interface ManualTryResult {
  statusCode: number | null;
  responseTimeMs: number | null;
  responseBody: unknown;
  responseHeaders: Record<string, string>;
  errorMessage: string | null;
  request: RequestSnapshot;
}
