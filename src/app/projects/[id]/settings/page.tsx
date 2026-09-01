"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useProject } from "@/lib/project-context";
import { Button } from "@/components/Button";

export default function SettingsPage() {
  const { project, variables, addVariable, deleteVariable, updateBaseUrl, error } = useProject();
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [secret, setSecret] = useState(true);
  const [baseUrl, setBaseUrl] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (project?.baseUrl) setBaseUrl(project.baseUrl);
  }, [project?.baseUrl]);

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

  async function onSaveUrl(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateBaseUrl(baseUrl);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold text-text">Settings</h1>
      {error && <p className="text-sm text-unhealthy">{error}</p>}

      <form onSubmit={(e) => void onSaveUrl(e)} className="rounded-md border border-line bg-surface p-4">
        <legend className="text-sm font-medium">API Base URL</legend>
        <input
          type="url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="mt-2 w-full rounded border border-line bg-bg px-3 py-2 font-mono text-sm outline-none focus:border-run"
        />
        <button type="submit" disabled={busy} className="mt-3 rounded bg-run px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          Save and rediscover
        </button>
      </form>

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
