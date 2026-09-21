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
import { RunButton } from "./RunButton";
import { Spinner } from "@/components/LoadingState";
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
    <div className="workbench flex h-screen overflow-hidden">
      <IconRail projectId={ctx.projectId} />

      <div className="flex min-w-0 min-h-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 overflow-hidden border-b border-line bg-surface px-4">
          <Link
            href="/projects"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-text-muted hover:bg-bg hover:text-text"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 6 9 12l6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Projects
          </Link>
          <span className="hidden shrink-0 text-text-muted sm:inline">/</span>
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-text">
            {ctx.project?.name ?? "Connect an API"}
          </p>
          <label className="hidden shrink-0 items-center gap-1.5 text-xs text-text-muted lg:flex">
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
            {ctx.running ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="h-3.5 w-3.5" />
                Running…
              </span>
            ) : (
              "Run check"
            )}
          </RunButton>
          <ThemeToggle />
          <span className="hidden max-w-[160px] truncate text-xs text-text-muted xl:inline">
            {user?.email}
          </span>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="shrink-0 text-xs text-link"
          >
            Log out
          </button>
        </header>

        <div className="flex min-h-0 min-w-0 flex-1">
          <EndpointTree
            projectId={ctx.projectId}
            apiName={ctx.project?.name ?? "No API"}
            endpoints={ctx.project?.endpoints ?? []}
            onImport={() => ctx.openConnect()}
            discovering={!ctx.project || (ctx.isProbing && !(ctx.project.endpoints?.length))}
          />
          <main className="min-h-0 min-w-0 flex-1 overflow-auto bg-bg">
            <div className="mx-auto w-full max-w-[1080px] px-6 py-6">{children}</div>
          </main>
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
