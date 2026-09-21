"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function ExplainPanel({
  projectId,
  runId,
  endpointId,
  label,
}: {
  projectId: string;
  runId?: string;
  endpointId?: string;
  label: string;
}) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function explain() {
    if (!token) return;
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await api.explainRun(token, projectId, { runId, endpointId });
      setText(res.explanation);
    } catch (err) {
      setText(null);
      setError(err instanceof ApiError ? err.message : "Could not explain this check.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void explain()}
        disabled={loading}
        className="rounded border border-line bg-surface px-3 py-1.5 text-sm font-medium text-text hover:border-run/50 disabled:opacity-50"
      >
        {loading ? "Explaining…" : label}
      </button>
      {open && (
        <div className="rounded-md border border-line bg-panel-raised p-4 text-sm text-text">
          {loading && <p className="text-text-muted">Reading this check…</p>}
          {error && <p className="text-unhealthy">{error}</p>}
          {text && <ExplanationBody text={text} />}
        </div>
      )}
    </div>
  );
}

function ExplanationBody({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 2);

  return (
    <div className="max-w-2xl space-y-3 leading-relaxed text-text">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
