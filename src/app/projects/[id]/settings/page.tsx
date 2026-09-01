"use client";

import { useState, type FormEvent } from "react";
import { useProject } from "@/lib/project-context";
import { Button } from "@/components/Button";

export default function SettingsPage() {
  const { project, variables, addVariable, deleteVariable, error } = useProject();
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [secret, setSecret] = useState(true);
  const [busy, setBusy] = useState(false);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!key || !value) return;
    setBusy(true);
    try {
      await addVariable(key, value, secret);
      setKey("");
      setValue("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold text-text">Settings</h1>
      {error && <p className="text-sm text-unhealthy">{error}</p>}

      <section className="rounded-md border border-line bg-surface p-4">
        <h2 className="text-sm font-medium">API Base URL</h2>
        <p className="mt-2 break-all font-mono text-sm text-text">{project?.baseUrl ?? "—"}</p>
        <p className="mt-2 text-xs text-text-muted">
          Locked when this project was created. To monitor a different API, create a new project.
          Import an OpenAPI or Swagger spec if discovery only found GET routes.
        </p>
      </section>

      <section className="rounded-md border border-line bg-surface p-4">
        <h2 className="text-sm font-medium">Project variables</h2>
        <p className="mt-1 mb-3 text-xs text-text-muted">
          Optional API keys or Postman {"{{tokens}}"}. Stored encrypted when marked secret. Zero-input
          testing does not require these.
        </p>
        <div className="mb-3 space-y-1.5">
          {variables.length === 0 && <p className="text-xs text-text-muted">None set.</p>}
          {variables.map((v) => (
            <div key={v.id} className="flex items-center justify-between text-xs">
              <span className="font-mono">{v.key}</span>
              <div className="flex items-center gap-2">
                <span className="text-text-muted">{v.isSecret ? "••••••••" : v.value}</span>
                <button type="button" onClick={() => void deleteVariable(v.key)} className="text-text-muted hover:text-unhealthy">
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={(e) => void onAdd(e)} className="space-y-2">
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="API_TOKEN"
            className="w-full rounded border border-line bg-bg px-2 py-1.5 font-mono text-xs outline-none focus:border-run"
          />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="value"
            type={secret ? "password" : "text"}
            className="w-full rounded border border-line bg-bg px-2 py-1.5 text-xs outline-none focus:border-run"
          />
          <label className="flex items-center gap-1.5 text-xs text-text-muted">
            <input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} />
            Secret (encrypted)
          </label>
          <Button type="submit" variant="secondary" disabled={busy} className="w-full">
            Add variable
          </Button>
        </form>
      </section>
    </div>
  );
}
