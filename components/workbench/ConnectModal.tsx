"use client";

import { useState } from "react";

export function ConnectModal({
  onCancel,
  onContinue,
  busy,
}: {
  onCancel: () => void;
  onContinue: (file: File) => void;
  busy?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-md border border-line bg-surface">
        <header className="border-b border-line px-5 py-4">
          <h2 className="text-xl font-semibold text-text">Import OpenAPI / Swagger</h2>
          <p className="mt-1 text-xs text-text-muted">
            Base URL discovery often finds GET routes only. A spec adds POST, PUT, PATCH, and DELETE.
          </p>
        </header>
        <div className="px-5 py-5">
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
              .yaml .yml .json — endpoints from the spec are added to this project. The API Base URL does not change.
            </span>
          </label>
        </div>
        <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-sm text-text-muted hover:text-text">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !file}
            onClick={() => file && onContinue(file)}
            className="inline-flex items-center gap-2 rounded bg-run px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Importing…" : "Continue"}
          </button>
        </footer>
      </div>
    </div>
  );
}
