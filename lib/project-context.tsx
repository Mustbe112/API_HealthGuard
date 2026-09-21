"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "./api";
import { useAuth } from "./auth-context";
import { classifyOutcome, rollupResultsByEndpoint, summarizeOutcomes } from "./outcome";
import {
  classifyHealth,
  healthFromOutcome,
  scoreFromCounts,
  type HealthStatus,
} from "./workbench-health";
import type { EnvVariable, Endpoint, Project, RequestSnapshot, TestResult, TestRun } from "./types";

export type IncidentRow = {
  id: string;
  endpointId: string;
  method: Endpoint["method"];
  path: string;
  reason: string;
  statusCode: number | null;
  latencyMs: number | null;
  detectedAt: string;
};

type ProjectContextValue = {
  projectId: string;
  project: Project | null;
  error: string | null;
  uploadMsg: string | null;
  discovering: boolean;
  uploading: boolean;
  running: boolean;
  isProbing: boolean;
  probePhase: "discover" | "run";
  dryRun: boolean;
  setDryRun: (v: boolean) => void;
  runs: TestRun[];
  selectedRun: TestRun | null;
  variables: EnvVariable[];
  connectOpen: boolean;
  openConnect: () => void;
  closeConnect: () => void;
  startRun: () => Promise<void>;
  selectRun: (runId: string) => Promise<void>;
  discoverFromBaseUrl: () => Promise<void>;
  uploadSpec: (file: File) => Promise<void>;
  addVariable: (key: string, value: string, isSecret: boolean) => Promise<void>;
  deleteVariable: (key: string) => Promise<void>;
  summary: {
    score: number;
    status: HealthStatus;
    endpointCount: number;
    healthyCount: number;
    warningCount: number;
    unhealthyCount: number;
    workingCount: number;
    manualCount: number;
    brokenCount: number;
    skippedCount: number;
    avgLatencyMs: number;
    lastRunAt: string;
    hasRun: boolean;
    firstBroken: {
      endpointId: string;
      method: Endpoint["method"];
      path: string;
      statusCode: number | null;
      errorMessage: string | null;
      request: RequestSnapshot | null;
    } | null;
  };
  incidents: IncidentRow[];
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const { token } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [running, setRunning] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [variables, setVariables] = useState<EnvVariable[]>([]);
  const [connectOpen, setConnectOpen] = useState(false);
  const autoDiscovered = useRef(false);

  const loadProject = useCallback(async () => {
    if (!token) return;
    try {
      const { project: next } = await api.getProject(token, projectId);
      setProject(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load project");
    }
  }, [token, projectId]);

  const loadVariables = useCallback(async () => {
    if (!token) return;
    const { variables: next } = await api.listVariables(token, projectId);
    setVariables(next);
  }, [token, projectId]);

  const loadRuns = useCallback(async () => {
    if (!token) return;
    const { testRuns } = await api.listRuns(token, projectId);
    setRuns(testRuns);
    setSelectedRun((current) => {
      if (current) return current;
      return null;
    });
    if (testRuns[0]) {
      const { testRun } = await api.getRun(token, projectId, testRuns[0].id);
      setSelectedRun((current) => current ?? testRun);
    }
  }, [token, projectId]);

  useEffect(() => {
    autoDiscovered.current = false;
    setSelectedRun(null);
    setProject(null);
    void loadProject();
    void loadVariables();
  }, [loadProject, loadVariables]);

  useEffect(() => {
    void loadRuns();
  }, [projectId, token]);

  useEffect(() => {
    if (!token || !project || autoDiscovered.current) return;
    if ((project.endpoints?.length ?? 0) > 0) return;
    autoDiscovered.current = true;
    void discoverFromBaseUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, project]);

  useEffect(() => {
    if (!token || !selectedRun) return;
    if (selectedRun.status !== "RUNNING" && selectedRun.status !== "PENDING") return;
    const id = window.setInterval(async () => {
      try {
        const { testRun } = await api.getRun(token, projectId, selectedRun.id);
        setSelectedRun(testRun);
        if (testRun.status !== "RUNNING" && testRun.status !== "PENDING") {
          setRunning(false);
          const { testRuns } = await api.listRuns(token, projectId);
          setRuns(testRuns);
        }
      } catch {
        /* keep polling */
      }
    }, 700);
    return () => window.clearInterval(id);
  }, [token, projectId, selectedRun?.id, selectedRun?.status]);

  const startRun = useCallback(async () => {
    if (!token) return;
    setRunning(true);
    setError(null);
    try {
      const { testRun } = await api.triggerRun(token, projectId, dryRun);
      setSelectedRun(testRun);
      setRuns((prev) => [testRun, ...prev.filter((r) => r.id !== testRun.id)]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Run failed");
      setRunning(false);
    }
  }, [token, projectId, dryRun]);

  const discoverFromBaseUrl = useCallback(async () => {
    if (!token) return;
    setDiscovering(true);
    setError(null);
    setUploadMsg("Searching this host for a spec and live routes…");
    try {
      const res = await api.discoverSpec(token, projectId);
      await loadProject();
      if (res.count > 0) {
        const via = res.specUrl ? ` from ${res.specUrl}` : ` (${res.source})`;
        setUploadMsg(`Found ${res.count} endpoint(s)${via}. Running tests…`);
        await startRun();
      } else {
        setUploadMsg(
          res.error ?? "No endpoints found on this URL. Upload a spec, or check that the API is running."
        );
      }
    } catch (err) {
      setUploadMsg(err instanceof ApiError ? err.message : "Discovery failed");
    } finally {
      setDiscovering(false);
    }
  }, [token, projectId, loadProject, startRun]);

  const uploadSpec = useCallback(
    async (file: File) => {
      if (!token) return;
      setUploading(true);
      setUploadMsg(null);
      try {
        const res = await api.uploadSpec(token, projectId, file);
        setUploadMsg(`Parsed ${res.count} endpoints from ${res.format} file. Running tests…`);
        await loadProject();
        await startRun();
      } catch (err) {
        setUploadMsg(err instanceof ApiError ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [token, projectId, loadProject, startRun]
  );

  const selectRun = useCallback(
    async (runId: string) => {
      if (!token) return;
      const { testRun } = await api.getRun(token, projectId, runId);
      setSelectedRun(testRun);
    },
    [token, projectId]
  );

  const addVariable = useCallback(
    async (key: string, value: string, isSecret: boolean) => {
      if (!token) return;
      const { variables: next } = await api.setVariable(token, projectId, key, value, isSecret);
      setVariables(next);
    },
    [token, projectId]
  );

  const deleteVariable = useCallback(
    async (key: string) => {
      if (!token) return;
      const { variables: next } = await api.deleteVariable(token, projectId, key);
      setVariables(next);
    },
    [token, projectId]
  );

  const results = rollupResultsByEndpoint(selectedRun?.results ?? []);
  const counts = selectedRun
    ? summarizeOutcomes(results)
    : { workingCount: 0, brokenCount: 0, skippedCount: 0, manualCount: 0 };

  const latencies = results.map((r) => r.responseTimeMs).filter((n): n is number => n != null);
  const avgLatencyMs = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const score = scoreFromCounts(counts);
  const healthyCount = results.filter((r) => healthFromOutcome(classifyOutcome(r)) === "healthy").length;
  const warningCount = results.filter((r) => healthFromOutcome(classifyOutcome(r)) === "warning").length;
  const unhealthyCount = results.filter((r) => healthFromOutcome(classifyOutcome(r)) === "unhealthy").length;

  const brokenResults = results.filter((r) => classifyOutcome(r) === "broken");
  const firstBrokenResult = brokenResults[0] ?? null;
  const incidents: IncidentRow[] = brokenResults.map((r) => ({
    id: r.id,
    endpointId: r.endpointId,
    method: r.endpoint.method,
    path: r.endpoint.path,
    reason: r.errorMessage || `${r.endpoint.method} ${r.endpoint.path} · ${r.statusCode ?? "timeout"}`,
    statusCode: r.statusCode,
    latencyMs: r.responseTimeMs,
    detectedAt: r.createdAt,
  }));

  const runningNow = running || selectedRun?.status === "RUNNING";
  const hasRunResults = Boolean(selectedRun && (selectedRun.results?.length ?? 0) > 0);
  const isProbing =
    discovering ||
    (runningNow && !hasRunResults) ||
    (project !== null &&
      (project.endpoints?.length ?? 0) === 0 &&
      !uploadMsg &&
      !error);
  const probePhase: "discover" | "run" =
    discovering || (project !== null && (project.endpoints?.length ?? 0) === 0)
      ? "discover"
      : "run";

  const value: ProjectContextValue = {
    projectId,
    project,
    error,
    uploadMsg,
    discovering,
    uploading,
    running: runningNow,
    isProbing,
    probePhase,
    dryRun,
    setDryRun,
    runs,
    selectedRun,
    variables,
    connectOpen,
    openConnect: () => setConnectOpen(true),
    closeConnect: () => setConnectOpen(false),
    startRun,
    selectRun,
    discoverFromBaseUrl,
    uploadSpec,
    addVariable,
    deleteVariable,
    summary: {
      score,
      status: classifyHealth(score),
      endpointCount: results.length || (project?.endpoints?.length ?? 0),
      healthyCount,
      warningCount,
      unhealthyCount,
      workingCount: counts.workingCount,
      manualCount: counts.manualCount,
      brokenCount: counts.brokenCount,
      skippedCount: counts.skippedCount,
      avgLatencyMs,
      lastRunAt: selectedRun
        ? new Date(selectedRun.finishedAt ?? selectedRun.createdAt).toLocaleTimeString()
        : "—",
      hasRun: Boolean(selectedRun && results.length > 0),
      firstBroken: firstBrokenResult
        ? {
            endpointId: firstBrokenResult.endpointId,
            method: firstBrokenResult.endpoint.method,
            path: firstBrokenResult.endpoint.path,
            statusCode: firstBrokenResult.statusCode,
            errorMessage: firstBrokenResult.errorMessage,
            request: firstBrokenResult.probe?.request ?? null,
          }
        : null,
    },
    incidents,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}

export function resultForEndpoint(run: TestRun | null, endpointId: string): TestResult | undefined {
  const matches = (run?.results ?? []).filter((r) => r.endpointId === endpointId);
  return rollupResultsByEndpoint(matches)[0];
}
