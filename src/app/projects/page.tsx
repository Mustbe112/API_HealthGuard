"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Project } from "@/lib/types";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/Button";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ProjectsPage() {
  const { token, user, logout, isReady } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    api
      .listProjects(token)
      .then((res) => setProjects(res.projects))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load projects"));
  }, [token, router, isReady]);

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

  async function handleDelete(project: Project) {
    if (!token) return;
    const ok = window.confirm(`Delete “${project.name}”? This cannot be undone.`);
    if (!ok) return;
    setDeletingId(project.id);
    setError(null);
    try {
      await api.deleteProject(token, project.id);
      setProjects((prev) => (prev ?? []).filter((p) => p.id !== project.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete project");
    } finally {
      setDeletingId(null);
    }
  }

  if (!isReady || !token) return null;

  return (
    <div className="workbench min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <BrandMark />
          <div className="flex items-center gap-4 text-sm text-text-muted">
            <ThemeToggle showLabel />
            <span>{user?.email}</span>
            <button onClick={logout} className="hover:text-text">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Projects</h1>
          <Button onClick={() => setShowCreate((v) => !v)} className="!bg-run !text-white">
            {showCreate ? "Cancel" : "New project"}
          </Button>
        </div>

        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="mb-8 space-y-4 rounded-md border border-line bg-surface p-6"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Project name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-run"
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
                className="w-full rounded border border-line bg-bg px-3 py-2 font-mono text-sm outline-none focus:border-run"
                placeholder="http://localhost:4000"
              />
              <p className="mt-1.5 text-xs text-text-muted">
                We will look for OpenAPI/Swagger on this host, then probe live JSON routes. Use the
                API process (for example localhost:4000), not the website.
              </p>
            </div>
            <Button type="submit" disabled={creating} className="!bg-run !text-white">
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
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-md border border-line bg-surface px-5 py-4 transition-colors hover:border-run/50"
              >
                <Link href={`/projects/${p.id}`} className="min-w-0 flex-1">
                  <div className="font-medium">{p.name}</div>
                  <div className="truncate font-mono text-xs text-text-muted">{p.baseUrl}</div>
                </Link>
                <button
                  type="button"
                  onClick={() => void handleDelete(p)}
                  disabled={deletingId === p.id}
                  className="rounded px-2 py-1 text-xs text-text-muted hover:bg-unhealthy-soft hover:text-unhealthy disabled:opacity-50"
                >
                  {deletingId === p.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
