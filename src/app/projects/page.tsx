"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Project } from "@/lib/types";
import { Button } from "@/components/Button";

export default function ProjectsPage() {
  const { token, user, logout } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }
    api
      .listProjects(token)
      .then((res) => setProjects(res.projects))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load projects"));
  }, [token, router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setError(null);
    try {
      const { project } = await api.createProject(token, name, baseUrl);
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  if (!token) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-lg font-semibold tracking-tight">
            API Vitals
          </Link>
          <div className="flex items-center gap-4 text-sm text-text-muted">
            <span>{user?.email}</span>
            <button onClick={logout} className="hover:text-text">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-xl font-semibold">Projects</h1>
          <Button onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Cancel" : "New project"}
          </Button>
        </div>

        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="mb-8 space-y-4 rounded-xl border border-line bg-panel p-6"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Project name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-line bg-panel-raised px-3 py-2 text-sm outline-none focus:border-accent"
                placeholder="My API"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Base URL</label>
              <input
                required
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full rounded-lg border border-line bg-panel-raised px-3 py-2 font-mono text-sm outline-none focus:border-accent"
                placeholder="http://localhost:4000"
              />
              <p className="mt-1.5 text-xs text-text-muted">
                We will look for OpenAPI/Swagger on this host, then probe live JSON routes. Use the
                API process (for example localhost:4000), not the website.
              </p>
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create & discover"}
            </Button>
          </form>
        )}

        {error && <p className="mb-4 text-sm text-fail">{error}</p>}

        {projects === null ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-text-muted">
            No projects yet. Create one with your API URL (including localhost) to discover
            endpoints automatically.
          </div>
        ) : (
          <div className="grid gap-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center justify-between rounded-xl border border-line bg-panel px-5 py-4 transition-colors hover:border-accent/50"
              >
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="font-mono text-xs text-text-muted">{p.baseUrl}</div>
                </div>
                <span className="text-text-muted">→</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
