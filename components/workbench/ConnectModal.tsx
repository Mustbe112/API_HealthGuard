"use client";

import { useState, type ReactNode } from "react";

export type ConnectTab = "file" | "url";

export function ConnectModal({
  onCancel,
  onContinue,
  busy,
  initialTab = "file",
}: {
  onCancel: () => void;
  onContinue: (input: { kind: "file"; file: File } | { kind: "baseUrl"; baseUrl: string }) => void;
  busy?: boolean;
  initialTab?: ConnectTab;
}) {
  const [tab, setTab] = useState<ConnectTab>(initialTab);
  const [file, setFile] = useState<File | null>(null);
  const [baseUrl, setBaseUrl] = useState("");

  function submit() {
    if (tab === "file") {
      if (!file) return;
      onContinue({ kind: "file", file });
      return;
    }
    if (!baseUrl.trim()) return;
    onContinue({ kind: "baseUrl", baseUrl: baseUrl.trim() });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-md border border-line bg-surface">
        <header className="border-b border-line px-5 py-4">
          <h2 className="text-xl font-semibold text-text">Connect API</h2>
        </header>
        <div className="flex gap-2 border-b border-line px-5 pt-3">
          <Tab active={tab === "file"} onClick={() => setTab("file")}>
            Upload OpenAPI / Swagger
          </Tab>
          <Tab active={tab === "url"} onClick={() => setTab("url")}>
            Enter API Base URL
          </Tab>
        </div>
        <div className="px-5 py-5">
          {tab === "file" ? (
            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-line bg-bg px-4 text-center">
              <input
                type="file"
                accept=".yaml,.yml,.json,application/json,application/x-yaml,text/yaml"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <span className="text-sm text-text">
                {file ? file.name : "Drag and drop your OpenAPI file here, or click to browse"}
              </span>
              <span className="mt-2 text-xs text-text-muted">
                .yaml .yml .json — the system discovers endpoints from the spec.
              </span>
            </label>
          ) : (
            <div>
              <label className="text-xs font-medium text-text-muted" htmlFor="base-url">
                API Base URL
              </label>
              <input
                id="base-url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm text-text outline-none focus:border-run"
              />
              <p className="mt-2 text-xs text-text-muted">
                This is the backend API, not a website URL. We look for /openapi.json, /swagger.json,
                /api-docs, and /swagger/v1/swagger.json.
              </p>
            </div>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-sm text-text-muted hover:text-text">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || (tab === "file" ? !file : !baseUrl.trim())}
            onClick={submit}
            className="rounded bg-run px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Continue
          </button>
        </footer>
      </div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-1 pb-2 text-sm ${
        active ? "border-run text-text" : "border-transparent text-text-muted"
      }`}
    >
      {children}
    </button>
  );
}
