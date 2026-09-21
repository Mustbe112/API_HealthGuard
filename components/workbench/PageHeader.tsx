"use client";

import type { ReactNode } from "react";
import { BackButton } from "@/components/BackButton";

export function PageHeader({
  title,
  subtitle,
  actions,
  backHref,
  backLabel = "Back",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="mb-5 flex min-h-10 items-start justify-between gap-4">
      <div className="min-w-0">
        {backHref ? <BackButton href={backHref} label={backLabel} /> : null}
        <h1 className="min-w-0 text-xl font-semibold leading-tight text-text">{title}</h1>
        {subtitle ? <p className="mt-1 truncate text-sm text-text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
