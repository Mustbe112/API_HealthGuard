"use client";

import { LOCAL_CORS_SNIPPET } from "@/lib/local-target";

export function LocalDiscoverHelp({
  message,
  baseUrl,
}: {
  message: string;
  baseUrl?: string | null;
}) {
  const looksLikeSite =
    Boolean(baseUrl && /:(3000|5173)(\/|$)/.test(baseUrl)) || /looks like a website/i.test(message);

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(LOCAL_CORS_SNIPPET);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mt-4 space-y-3 text-left text-sm">
      {looksLikeSite ? (
        <p className="text-unhealthy">
          Base URL <span className="font-mono">{baseUrl}</span> is a website port. Use the other
          project’s <strong>API</strong> port (for example <span className="font-mono">http://localhost:5000</span>
          ), then create a <strong>new</strong> project — this one cannot change Base URL.
        </p>
      ) : (
        <p className="text-text-muted whitespace-pre-wrap">{message}</p>
      )}
      <div className="rounded-md border border-line bg-bg p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-text">
            Paste this into the API you are testing (not HealthGuard)
          </p>
          <button
            type="button"
            onClick={() => void copySnippet()}
            className="rounded px-2 py-1 text-xs text-text-muted hover:bg-surface hover:text-text"
          >
            Copy
          </button>
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-text-muted">
          {LOCAL_CORS_SNIPPET}
        </pre>
      </div>
    </div>
  );
}
