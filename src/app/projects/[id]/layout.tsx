"use client";

import { use, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ProjectProvider } from "@/lib/project-context";
import { WorkbenchShell } from "@/components/workbench/WorkbenchShell";

export default function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token, isReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !token) router.replace("/login");
  }, [isReady, token, router]);

  if (!isReady || !token) {
    return (
      <div className="workbench flex min-h-screen items-center justify-center text-sm text-text-muted">
        Loading…
      </div>
    );
  }

  return (
    <ProjectProvider projectId={id}>
      <WorkbenchShell>{children}</WorkbenchShell>
    </ProjectProvider>
  );
}
