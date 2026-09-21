"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useProject } from "@/lib/project-context";
import { ConnectModal } from "./ConnectModal";
import { EndpointTree } from "./EndpointTree";
import { IconRail } from "./IconRail";
import { IncidentRail } from "./IncidentRail";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BackButton } from "@/components/BackButton";
import { RunButton } from "./RunButton";
import type { ReactNode } from "react";

export function WorkbenchShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const ctx = useProject();
  const showIncidents = pathname === `/projects/${ctx.projectId}` || pathname.includes("/incidents");

  async function onImportSpec(file: File) {
    await ctx.uploadSpec(file);
    ctx.closeConnect();
  }

  return (
    <div className="workbench flex h-screen min-h-0">
      <IconRail projectId={ctx.projectId} />
      <EndpointTree
        projectId={ctx.projectId}
        apiName={ctx.project?.name ?? "No API"}
        endpoints={ctx.project?.endpoints ?? []}
        onImport={() => ctx.openConnect()}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4">
          <div className="flex min-w-0 items-center gap-1">
            <BackButton href="/projects" label="Projects" />
            <span className="hidden text-text-muted sm:inline">/</span>
            <Link
              href={`/projects/${ctx.projectId}`}
              className="hidden truncate text-sm text-text hover:text-link sm:inline"
            >
              {ctx.project?.name ?? "Connect an API"}
            </Link>
            <span className="hidden text-text-muted sm:inline">/</span>
            <Link
              href={`/projects/${ctx.projectId}/endpoints`}
              className="hidden truncate text-sm text-text-muted hover:text-text sm:inline"
            >
              Endpoints
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <label className="hidden items-center gap-1.5 text-xs text-text-muted sm:flex">
              <input
                type="checkbox"
                checked={ctx.dryRun}
                onChange={(e) => ctx.setDryRun(e.target.checked)}
              />
              Skip writes
            </label>
            <RunButton
              onClick={() => void ctx.startRun()}
              disabled={ctx.running || !(ctx.project?.endpoints?.length)}
            >
              {ctx.running ? "Running…" : pathname.includes("/endpoints/") ? "Run again" : "Run health check"}
            </RunButton>
            <ThemeToggle showLabel />
            <span className="text-xs text-text-muted">{user?.email}</span>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="text-xs text-link"
            >
              Log out
            </button>
          </div>
        </header>
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-auto bg-bg p-6">{children}</main>
          {showIncidents ? <IncidentRail projectId={ctx.projectId} incidents={ctx.incidents} /> : null}
        </div>
      </div>
      {ctx.connectOpen ? (
        <ConnectModal
          busy={ctx.uploading}
          onCancel={ctx.closeConnect}
          onContinue={(file) => void onImportSpec(file)}
        />
      ) : null}
    </div>
  );
}
