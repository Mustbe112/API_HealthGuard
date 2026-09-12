import type { EnvVariable, ManualTryResult, Project, TestRun, User } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(rest.body && !(rest.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    const message =
      typeof body?.error === "string"
        ? body.error
        : body?.error
          ? JSON.stringify(body.error)
          : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return body as T;
}

export const api = {
  signup: (email: string, password: string) =>
    request<{ user: User; token: string }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ user: User; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: (token: string) => request<{ user: User }>("/auth/me", { token }),

  listProjects: (token: string) =>
    request<{ projects: Project[] }>("/projects", { token }),

  createProject: (token: string, name: string, baseUrl: string) =>
    request<{ project: Project }>("/projects", {
      method: "POST",
      token,
      body: JSON.stringify({ name, baseUrl }),
    }),

  getProject: (token: string, projectId: string) =>
    request<{ project: Project }>(`/projects/${projectId}`, { token }),

  updateProject: (token: string, projectId: string, data: { name?: string }) =>
    request<{ project: Project }>(`/projects/${projectId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  uploadSpec: (token: string, projectId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ format: string; count: number }>(
      `/projects/${projectId}/upload`,
      { method: "POST", token, body: formData }
    );
  },

  discoverSpec: (token: string, projectId: string) =>
    request<{
      source: string;
      count: number;
      specUrl?: string;
      error?: string;
    }>(`/projects/${projectId}/discover`, {
      method: "POST",
      token,
      body: JSON.stringify({}),
    }),

  triggerRun: (token: string, projectId: string, dryRun: boolean) =>
    request<{ testRun: TestRun }>(`/projects/${projectId}/run`, {
      method: "POST",
      token,
      body: JSON.stringify({ dryRun }),
    }),

  listRuns: (token: string, projectId: string) =>
    request<{ testRuns: TestRun[] }>(`/projects/${projectId}/runs`, { token }),

  getRun: (token: string, projectId: string, runId: string) =>
    request<{ testRun: TestRun }>(`/projects/${projectId}/runs/${runId}`, { token }),

  listVariables: (token: string, projectId: string) =>
    request<{ variables: EnvVariable[] }>(`/projects/${projectId}/variables`, { token }),

  setVariable: (token: string, projectId: string, key: string, value: string, isSecret: boolean) =>
    request<{ variables: EnvVariable[] }>(`/projects/${projectId}/variables`, {
      method: "POST",
      token,
      body: JSON.stringify({ key, value, isSecret }),
    }),

  deleteVariable: (token: string, projectId: string, key: string) =>
    request<{ variables: EnvVariable[] }>(
      `/projects/${projectId}/variables/${key}`,
      { method: "DELETE", token }
    ),

  updateEndpoint: (
    token: string,
    projectId: string,
    endpointId: string,
    data: { dependsOnId?: string | null; expectedStatus?: number }
  ) =>
    request(`/projects/${projectId}/endpoints/${endpointId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  explainRun: (
    token: string,
    projectId: string,
    data: { runId?: string; endpointId?: string } = {}
  ) =>
    request<{ explanation: string }>(`/projects/${projectId}/explain`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  tryEndpoint: (
    token: string,
    projectId: string,
    endpointId: string,
    data: {
      pathParams?: Record<string, string>;
      query?: Record<string, string>;
      headers?: Record<string, string>;
      body?: string;
      bearerToken?: string;
    }
  ) =>
    request<{ result: ManualTryResult }>(`/projects/${projectId}/endpoints/${endpointId}/try`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),
};
