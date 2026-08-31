"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { EnvVariable, Project, TestResult, TestRun } from "@/lib/types";
import { Button } from "@/components/Button";
import { MethodBadge } from "@/components/MethodBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { LatencyBar } from "@/components/LatencyBar";
import { EndpointTester } from "@/components/EndpointTester";

type Filter = "broken" | "working" | "all";
type Tab = "results" | "try";

export default function ProjectDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { token } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [variables, setVariables] = useState<EnvVariable[]>([]);
  const [varKey, setVarKey] = useState("");
  const [varValue, setVarValue] = useState("");
  const [varSecret, setVarSecret] = useState(true);
  const [savingVar, setSavingVar] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [runs, setRuns] = useState<TestRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [running, setRunning] = useState(false);
  const [dryRun, setDryRun] = useState(false);

  const [filter, setFilter] = useState<Filter>("broken");
  const [tab, setTab] = useState<Tab>("results");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tryEndpointId, setTryEndpointId] = useState<string | null>(null);

  const [editingUrl, setEditingUrl] = useState(false);
  const [baseUrlDraft, setBaseUrlDraft] = useState("");
  const [savingUrl, setSavingUrl] = useState(false);

  const loadProject = useCallback(async () => {
    if (!token) return;
    try {
      const { project } = await api.getProject(token, projectId);
      setProject(project);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load project");
    }
  }, [token, projectId]);

  const loadVariables = useCallback(async () => {
    if (!token) return;
    const { variables } = await api.listVariables(token, projectId);
    setVariables(variables);
  }, [token, projectId]);

  const loadRuns = useCallback(async () => {
    if (!token) return;
    const { testRuns } = await api.listRuns(token, projectId);
    setRuns(testRuns);
  }, [token, projectId]);

  useEffect(() => {
    loadProject();
    loadVariables();
    loadRuns();
  }, [loadProject, loadVariables, loadRuns]);

  useEffect(() => {
    if (!token || !selectedRun) return;
    if (selectedRun.status !== "RUNNING" && selectedRun.status !== "PENDING") return;

    const id = window.setInterval(async () => {
      try {
        const { testRun } = await api.getRun(token, projectId, selectedRun.id);
        setSelectedRun(testRun);
        if (testRun.status !== "RUNNING" && testRun.status !== "PENDING") {
          setRunning(false);
          loadRuns();
        }
      } catch {
        // keep polling; a single failed tick shouldn't kill the run view
      }
    }, 700);

    return () => window.clearInterval(id);
  }, [token, projectId, selectedRun?.id, selectedRun?.status, loadRuns]);

  async function startRun() {
    if (!token) return;
    setRunning(true);
    setError(null);
    setTab("results");
    setFilter("broken");
    try {
      const { testRun } = await api.triggerRun(token, projectId, dryRun);
      setSelectedRun(testRun);
      setRuns((prev) => [testRun, ...prev.filter((r) => r.id !== testRun.id)]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Run failed");
      setRunning(false);
    }
  }

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!token || !file) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      const res = await api.uploadSpec(token, projectId, file);
      setUploadMsg(`Parsed ${res.count} endpoints from ${res.format} file. Running tests…`);
      await loadProject();
      if (fileInputRef.current) fileInputRef.current.value = "";
      await startRun();
    } catch (err) {
      setUploadMsg(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleAddVariable(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !varKey || !varValue) return;
    setSavingVar(true);
    try {
      const { variables } = await api.setVariable(token, projectId, varKey, varValue, varSecret);
      setVariables(variables);
      setVarKey("");
      setVarValue("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save variable");
    } finally {
      setSavingVar(false);
    }
  }

  async function handleDeleteVariable(key: string) {
    if (!token) return;
    const { variables } = await api.deleteVariable(token, projectId, key);
    setVariables(variables);
  }

  async function handleSelectRun(runId: string) {
    if (!token) return;
    const { testRun } = await api.getRun(token, projectId, runId);
    setSelectedRun(testRun);
    setTab("results");
  }

  async function handleSaveBaseUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingUrl(true);
    try {
      const { project } = await api.updateProject(token, projectId, { baseUrl: baseUrlDraft });
      setProject(project);
      setEditingUrl(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update base URL");
    } finally {
      setSavingUrl(false);
    }
  }

  function openTry(endpointId: string) {
    setTryEndpointId(endpointId);
    setTab("try");
  }

  if (!token) return null;
  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-text-muted">
        {error ?? "Loading…"}
      </div>
    );
  }

  const results = selectedRun?.results ?? [];
  const maxMs = Math.max(1, ...results.map((r) => r.responseTimeMs ?? 0));
  const workingCount = selectedRun?.workingCount ?? results.filter((r) => r.passed && r.statusCode !== null).length;
  const brokenCount = selectedRun?.brokenCount ?? results.filter((r) => !r.passed).length;
  const avgMs =
    results.filter((r) => r.responseTimeMs !== null).length > 0
      ? Math.round(
          results.reduce((sum, r) => sum + (r.responseTimeMs ?? 0), 0) /
            results.filter((r) => r.responseTimeMs !== null).length
        )
      : null;

  const filtered = results.filter((r) => {
    if (filter === "broken") return !r.passed;
    if (filter === "working") return r.passed && r.statusCode !== null;
    return true;
  });

  const inProgress = running || selectedRun?.status === "RUNNING";

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <Link href="/projects" className="text-xs text-text-muted hover:text-text">
            ← Projects
          </Link>
          <div className="mt-1 flex items-baseline justify-between gap-4">
            <h1 className="font-display text-xl font-semibold">{project.name}</h1>
            {editingUrl ? (
              <form onSubmit={handleSaveBaseUrl} className="flex items-center gap-2">
                <input
                  value={baseUrlDraft}
                  onChange={(e) => setBaseUrlDraft(e.target.value)}
                  type="url"
                  required
                  className="w-72 rounded border border-line bg-panel-raised px-2 py-1 font-mono text-xs outline-none focus:border-accent"
                />
                <Button type="submit" disabled={savingUrl} className="!px-3 !py-1 text-xs">
                  Save
                </Button>
                <button type="button" onClick={() => setEditingUrl(false)} className="text-xs text-text-muted">
                  Cancel
                </button>
              </form>
            ) : (
              <button
                onClick={() => {
                  setBaseUrlDraft(project.baseUrl);
                  setEditingUrl(true);
                }}
                className="font-mono text-xs text-text-muted hover:text-text"
                title="Edit base URL"
              >
                {project.baseUrl}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-6">
          <section className="rounded-xl border border-line bg-panel p-4">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
              Spec file
            </h2>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.yaml,.yml"
              className="mb-3 w-full text-xs text-text-muted file:mr-2 file:rounded file:border-0 file:bg-panel-raised file:px-2 file:py-1 file:text-xs file:text-text"
            />
            <Button variant="secondary" onClick={handleUpload} disabled={uploading || running} className="w-full">
              {uploading ? "Uploading…" : "Upload & run"}
            </Button>
            {uploadMsg && <p className="mt-2 text-xs text-text-muted">{uploadMsg}</p>}
            <p className="mt-2 text-xs text-text-muted">
              {project.endpoints?.length ?? 0} endpoint(s) loaded. Upload runs zero-input tests
              automatically.
            </p>
          </section>

          <details className="rounded-xl border border-line bg-panel p-4">
            <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-text-muted">
              Advanced — variables
            </summary>
            <p className="mt-2 mb-3 text-xs text-text-muted">
              Optional. Used for extra API keys or Postman {"{{tokens}}"}. Zero-input testing
              does not need these.
            </p>
            <div className="mb-3 space-y-1.5">
              {variables.length === 0 && <p className="text-xs text-text-muted">None set.</p>}
              {variables.map((v) => (
                <div key={v.id} className="flex items-center justify-between text-xs">
                  <span className="font-mono">{v.key}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted">{v.isSecret ? "••••••••" : v.value}</span>
                    <button
                      onClick={() => handleDeleteVariable(v.key)}
                      className="text-text-muted hover:text-fail"
                      aria-label={`Delete ${v.key}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddVariable} className="space-y-2">
              <input
                value={varKey}
                onChange={(e) => setVarKey(e.target.value)}
                placeholder="API_TOKEN"
                className="w-full rounded border border-line bg-panel-raised px-2 py-1.5 font-mono text-xs outline-none focus:border-accent"
              />
              <input
                value={varValue}
                onChange={(e) => setVarValue(e.target.value)}
                placeholder="value"
                type={varSecret ? "password" : "text"}
                className="w-full rounded border border-line bg-panel-raised px-2 py-1.5 text-xs outline-none focus:border-accent"
              />
              <label className="flex items-center gap-1.5 text-xs text-text-muted">
                <input
                  type="checkbox"
                  checked={varSecret}
                  onChange={(e) => setVarSecret(e.target.checked)}
                />
                Secret (encrypted)
              </label>
              <Button type="submit" variant="secondary" disabled={savingVar} className="w-full">
                Add variable
              </Button>
            </form>
          </details>

          <section className="rounded-xl border border-line bg-panel p-4">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
              Run history
            </h2>
            {runs.length === 0 ? (
              <p className="text-xs text-text-muted">No runs yet.</p>
            ) : (
              <div className="space-y-1">
                {runs.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectRun(r.id)}
                    className={`block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-panel-raised ${
                      selectedRun?.id === r.id ? "bg-panel-raised" : ""
                    }`}
                  >
                    <div>
                      <span className="text-text-muted">
                        {new Date(r.createdAt).toLocaleTimeString()}
                      </span>{" "}
                      <span
                        className={
                          r.status === "COMPLETED"
                            ? "text-pass"
                            : r.status === "FAILED" || r.status === "RUNNING"
                              ? r.status === "FAILED"
                                ? "text-fail"
                                : "text-pending"
                              : "text-pending"
                        }
                      >
                        {r.status.toLowerCase()}
                      </span>
                      {r.dryRun && <span className="text-text-muted"> · dry run</span>}
                    </div>
                    {(r.workingCount != null || r.brokenCount != null) && (
                      <div className="mt-0.5 text-text-muted">
                        <span className="text-pass">{r.workingCount ?? 0} working</span>
                        {" · "}
                        <span className="text-fail">{r.brokenCount ?? 0} broken</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        </aside>

        <div>
          <div className="mb-4 flex gap-1 rounded-lg border border-line bg-panel p-1">
            <TabButton active={tab === "results"} onClick={() => setTab("results")}>
              Run results
            </TabButton>
            <TabButton active={tab === "try"} onClick={() => setTab("try")}>
              Try endpoints
            </TabButton>
          </div>

          {tab === "try" ? (
            <EndpointTester
              token={token}
              projectId={projectId}
              endpoints={project.endpoints ?? []}
              selectedId={tryEndpointId ?? project.endpoints?.[0]?.id ?? null}
              onSelect={setTryEndpointId}
            />
          ) : (
            <>
              <div className="mb-6 rounded-xl border border-line bg-panel p-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-text-muted">
                    <input
                      type="checkbox"
                      checked={dryRun}
                      onChange={(e) => setDryRun(e.target.checked)}
                    />
                    Skip writes (POST/PUT/PATCH/DELETE)
                  </label>
                  <Button onClick={startRun} disabled={running || !project.endpoints?.length}>
                    {inProgress ? "Running…" : "Run tests"}
                  </Button>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-text-muted">
                  Zero-input checks every route automatically. Use Try endpoints when you want
                  to send real data, like Postman.
                </p>
              </div>

              {error && <p className="mb-4 text-sm text-fail">{error}</p>}

              {selectedRun ? (
                <>
                  <div className="mb-4 grid grid-cols-3 gap-3">
                    <Vital label="Working" value={String(workingCount)} tone="pass" />
                    <Vital label="Broken" value={String(brokenCount)} tone="fail" />
                    <Vital
                      label="Avg latency"
                      value={avgMs !== null ? `${avgMs}ms` : "—"}
                      tone="neutral"
                    />
                  </div>

                  {inProgress && (
                    <p className="mb-3 text-xs text-pending">
                      Running… {results.length} probe{results.length === 1 ? "" : "s"} finished
                    </p>
                  )}

                  <div className="mb-3 flex gap-1">
                    <FilterChip active={filter === "broken"} onClick={() => setFilter("broken")}>
                      Broken ({brokenCount})
                    </FilterChip>
                    <FilterChip active={filter === "working"} onClick={() => setFilter("working")}>
                      Working ({workingCount})
                    </FilterChip>
                    <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                      All ({results.length})
                    </FilterChip>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-line">
                    {filtered.length === 0 ? (
                      <div className="p-8 text-center text-sm text-text-muted">
                        {inProgress
                          ? "Still running — no matching probes yet."
                          : filter === "broken"
                            ? "Nothing broken in this run."
                            : "No results in this filter."}
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-line bg-panel text-left text-xs uppercase tracking-wide text-text-muted">
                            <th className="px-4 py-2 font-medium">Endpoint</th>
                            <th className="px-4 py-2 font-medium">Sent</th>
                            <th className="px-4 py-2 font-medium">Status</th>
                            <th className="px-4 py-2 font-medium">Latency</th>
                            <th className="px-4 py-2 font-medium">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((r) => (
                            <ResultRow
                              key={r.id}
                              result={r}
                              maxMs={maxMs}
                              expanded={expandedId === r.id}
                              onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
                              onTry={() => openTry(r.endpointId)}
                            />
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-text-muted">
                  {project.endpoints?.length
                    ? "Upload a spec (tests run automatically) or click Run tests. Switch to Try endpoints to send real data."
                    : "Upload a spec file to get started."}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function ResultRow({
  result: r,
  maxMs,
  expanded,
  onToggle,
  onTry,
}: {
  result: TestResult;
  maxMs: number;
  expanded: boolean;
  onToggle: () => void;
  onTry: () => void;
}) {
  const skipped = r.statusCode === null && r.passed;
  const req = r.probe?.request;

  return (
    <>
      <tr
        className="cursor-pointer border-b border-line bg-panel last:border-0 hover:bg-panel-raised"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <MethodBadge method={r.endpoint.method} />
            <span className="font-mono text-xs">{r.endpoint.path}</span>
          </div>
          {!r.passed && r.errorMessage && (
            <p className="mt-1 text-xs text-fail">{r.errorMessage}</p>
          )}
          {r.passed && r.probe?.caution && (
            <p className="mt-1 text-xs text-pending">{r.probe.caution}</p>
          )}
          {r.passed && r.probe?.proves && !r.probe.caution && (
            <p className="mt-1 text-xs text-text-muted">{r.probe.proves}</p>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-text-muted">{r.probe?.sent ?? "—"}</td>
        <td className={`px-4 py-3 font-mono text-xs ${statusTone(r.statusCode, r.passed)}`}>
          {r.statusCode ?? "—"}
        </td>
        <td className="px-4 py-3">
          <LatencyBar ms={r.responseTimeMs} maxMs={maxMs} passed={r.passed} />
        </td>
        <td className="px-4 py-3">
          <StatusBadge passed={r.passed} skipped={skipped} />
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-line bg-panel">
          <td colSpan={5} className="px-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-text-muted">
                  Request
                </div>
                {req ? (
                  <>
                    <p className="mb-2 break-all font-mono text-[11px] text-text-muted">
                      {req.method} {req.url}
                    </p>
                    <pre className="max-h-48 overflow-auto rounded border border-line bg-panel-raised p-2 font-mono text-[11px]">
                      {formatBlock(req.headers, req.body)}
                    </pre>
                  </>
                ) : (
                  <p className="text-xs text-text-muted">No request was sent.</p>
                )}
              </div>
              <div>
                <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-text-muted">
                  Response
                </div>
                <pre className="max-h-48 overflow-auto rounded border border-line bg-panel-raised p-2 font-mono text-[11px]">
                  {prettyJson(r.responseBody) || "(empty)"}
                </pre>
              </div>
            </div>
            <div className="mt-3">
              <Button
                variant="secondary"
                className="!px-3 !py-1 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onTry();
                }}
              >
                Try with real data
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function formatBlock(headers: Record<string, string>, body?: string): string {
  const headerLines = Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return body ? `${headerLines}\n\n${body}` : headerLines || "(no headers)";
}

function prettyJson(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function statusTone(status: number | null, passed: boolean): string {
  if (status === null) return "text-text-muted";
  if (status >= 500) return "text-fail";
  if (passed) return "text-pass";
  return "text-text-muted";
}

function Vital({ label, value, tone }: { label: string; value: string; tone: "pass" | "fail" | "neutral" }) {
  const color = tone === "pass" ? "text-pass" : tone === "fail" ? "text-fail" : "text-text";
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
      <div className={`mt-1 font-display text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs ${
        active ? "bg-panel-raised text-text" : "text-text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-1.5 text-sm ${
        active ? "bg-panel-raised text-text" : "text-text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
