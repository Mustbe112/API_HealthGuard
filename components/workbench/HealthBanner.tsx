"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import type { HealthStatus } from "@/lib/workbench-health";
import type { Endpoint, RequestSnapshot } from "@/lib/types";
import { MethodBadge } from "@/components/MethodBadge";
import { ExplainPanel } from "./ExplainPanel";

type FirstBroken = {
  endpointId: string;
  method: Endpoint["method"];
  path: string;
  statusCode: number | null;
  errorMessage: string | null;
  request: RequestSnapshot | null;
};

export function HealthBanner({
  summary,
  projectId,
  runId,
  running,
  onSaveTokenAndRecheck,
}: {
  summary: {
    score: number;
    status: HealthStatus;
    workingCount: number;
    manualCount: number;
    brokenCount: number;
    lastRunAt: string;
    hasRun: boolean;
    firstBroken: FirstBroken | null;
  };
  projectId: string;
  runId?: string;
  running?: boolean;
  onSaveTokenAndRecheck: (token: string) => Promise<void>;
}) {
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [showLastRequest, setShowLastRequest] = useState(false);
  const [tokenValue, setTokenValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  async function submitToken(e: FormEvent) {
    e.preventDefault();
    const value = tokenValue.trim();
    if (!value) return;
    setSaving(true);
    setTokenError(null);
    try {
      await onSaveTokenAndRecheck(value);
      setTokenValue("");
      setShowTokenForm(false);
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : "Could not save the token");
    } finally {
      setSaving(false);
    }
  }

  if (!summary.hasRun) {
    return (
      <section className="rounded-md border border-line bg-surface p-6">
        <p className="text-sm text-text-muted">
          No health check yet. Run a check to see which routes are working, need a login, or are
          broken.
        </p>
      </section>
    );
  }

  const req = summary.firstBroken?.request;

  return (
    <section className="rounded-md border border-line bg-surface p-6">
      <p className="text-xs text-text-muted">Last run {summary.lastRunAt}</p>
      <p className="mt-1 text-sm text-text">
        {plainSummary(summary.workingCount, summary.manualCount, summary.brokenCount)}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Bucket
          tone="healthy"
          title="Working"
          count={summary.workingCount}
          body="These routes answered. No action needed."
        />
        <Bucket
          tone="warning"
          title="Needs a login"
          count={summary.manualCount}
          body="Got 401 or 403 — the route is up, but this check had no real login."
          action={
            summary.manualCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setShowTokenForm((open) => !open);
                  setShowLastRequest(false);
                }}
                className="rounded bg-warning px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                disabled={running || saving}
              >
                Paste a token and re-check
              </button>
            ) : null
          }
        />
        <Bucket
          tone="unhealthy"
          title="Broken"
          count={summary.brokenCount}
          body="5xx or no response. The server failed or did not answer."
          action={
            summary.brokenCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setShowLastRequest((open) => !open);
                  setShowTokenForm(false);
                }}
                className="rounded bg-unhealthy px-2.5 py-1 text-xs font-medium text-white"
              >
                See the last request
              </button>
            ) : null
          }
        />
      </div>

      {showTokenForm && summary.manualCount > 0 && (
        <form onSubmit={(e) => void submitToken(e)} className="mt-4 space-y-2 rounded-md border border-warning/30 bg-warning-soft p-4">
          <p className="text-sm font-medium text-text">Paste a bearer token</p>
          <p className="text-xs text-text-muted">
            Saved as <span className="font-mono">API_TOKEN</span> (encrypted). The next check will
            send it on protected routes.
          </p>
          <input
            type="password"
            value={tokenValue}
            onChange={(e) => setTokenValue(e.target.value)}
            placeholder="eyJhbGciOi…"
            autoComplete="off"
            className="w-full rounded border border-line bg-bg px-3 py-2 font-mono text-sm outline-none focus:border-run"
          />
          {tokenError && <p className="text-xs text-unhealthy">{tokenError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || running || !tokenValue.trim()}
              className="rounded bg-run px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving || running ? "Re-checking…" : "Save and re-check"}
            </button>
            <button
              type="button"
              onClick={() => setShowTokenForm(false)}
              className="rounded px-3 py-1.5 text-sm text-text-muted hover:text-text"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {showLastRequest && summary.firstBroken && (
        <div className="mt-4 space-y-2 rounded-md border border-unhealthy/30 bg-unhealthy-soft p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-text">Last broken request</p>
            <Link
              href={`/projects/${projectId}/endpoints/${summary.firstBroken.endpointId}?tab=log`}
              className="text-xs text-link hover:underline"
            >
              Open full log
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <MethodBadge method={summary.firstBroken.method} />
            <span className="font-mono text-xs">{summary.firstBroken.path}</span>
            <span className="font-mono text-xs text-unhealthy">
              {summary.firstBroken.statusCode ?? "no response"}
            </span>
          </div>
          {summary.firstBroken.errorMessage && (
            <p className="text-xs text-unhealthy">{summary.firstBroken.errorMessage}</p>
          )}
          {req ? (
            <pre className="max-h-56 overflow-auto rounded border border-line bg-bg p-2 font-mono text-[11px]">
              {req.method} {req.url}
              {"\n"}
              {Object.entries(req.headers)
                .map(([k, v]) => `${k}: ${v}`)
                .join("\n")}
              {req.body ? `\n\n${req.body}` : ""}
            </pre>
          ) : (
            <p className="text-xs text-text-muted">No request was sent for this probe.</p>
          )}
        </div>
      )}

      <div className="mt-4">
        <ExplainPanel projectId={projectId} runId={runId} label="Explain this run" />
      </div>
      <p className="mt-3 text-xs text-text-muted">Score {summary.score} / 100</p>
    </section>
  );
}

function Bucket({
  tone,
  title,
  count,
  body,
  action,
}: {
  tone: "healthy" | "warning" | "unhealthy";
  title: string;
  count: number;
  body: string;
  action?: ReactNode;
}) {
  const wrap =
    tone === "healthy"
      ? "bg-healthy-soft border-healthy/20"
      : tone === "warning"
        ? "bg-warning-soft border-warning/20"
        : "bg-unhealthy-soft border-unhealthy/20";
  const number =
    tone === "healthy" ? "text-healthy" : tone === "warning" ? "text-warning" : "text-unhealthy";

  return (
    <div className={`flex flex-col rounded-md border p-4 ${wrap}`}>
      <p className={`text-2xl font-semibold ${number}`}>{count}</p>
      <p className="mt-1 text-sm font-medium text-text">{title}</p>
      <p className="mt-1 flex-1 text-xs text-text-muted">{body}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function plainSummary(working: number, login: number, broken: number): string {
  const parts: string[] = [];
  if (working) parts.push(`${working} working`);
  if (login) parts.push(`${login} need a login`);
  if (broken) parts.push(`${broken} broken`);
  if (parts.length === 0) return "This run did not classify any routes.";
  return parts.join(" · ");
}
