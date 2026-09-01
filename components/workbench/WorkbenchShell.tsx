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
import type { ReactNode } from "react";

export function WorkbenchShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const ctx = useProject();
  const showIncidents = pathname === `/projects/${ctx.projectId}` || pathname.includes("/incidents");

  async function onConnect(input: { kind: "file"; file: File } | { kind: "baseUrl"; baseUrl: string }) {
    if (input.kind === "file") {
      await ctx.uploadSpec(input.file);
    } else {
      await ctx.updateBaseUrl(input.baseUrl);
    }
    ctx.closeConnect();
  }

  return (
    <div className="workbench flex h-screen min-h-0">
      <IconRail projectId={ctx.projectId} />
      <EndpointTree
        projectId={ctx.projectId}
        apiName={ctx.project?.name ?? "No API"}
        endpoints={ctx.project?.endpoints ?? []}
        onImport={() => ctx.openConnect("file")}
        onNew={() => ctx.openConnect("url")}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-line bg-surface px-4">
          <p className="hidden truncate text-sm text-text-muted sm:block">
            <Link href="/projects" className="text-text hover:text-link">
              Project
            </Link>
            <span className="mx-1">/</span>
            {ctx.project?.name ?? "Connect an API"}
          </p>
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
            <ThemeToggle />
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
          key={ctx.connectTab}
          initialTab={ctx.connectTab}
          busy={ctx.uploading || ctx.discovering}
          onCancel={ctx.closeConnect}
          onContinue={(input) => void onConnect(input)}
        />
      ) : null}
    </div>
  );
}
