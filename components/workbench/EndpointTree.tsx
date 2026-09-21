"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Endpoint } from "@/lib/types";
import { MethodBadge } from "@/components/MethodBadge";
import { EndpointTreeSkeleton } from "@/components/LoadingState";

export function EndpointTree({
  projectId,
  apiName,
  endpoints,
  onImport,
  discovering,
}: {
  projectId: string;
  apiName: string;
  endpoints: Endpoint[];
  onImport: () => void;
  discovering?: boolean;
}) {
  const [q, setQ] = useState("");
  const pathname = usePathname();
  const visible = endpoints.filter((e) => `${e.method} ${e.path}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-3">
        <button
          type="button"
          onClick={onImport}
          className="w-full rounded border border-line px-2 py-1.5 text-xs font-medium text-text hover:bg-bg"
        >
          Import spec
        </button>
      </div>
      <div className="shrink-0 border-b border-line p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search routes"
          className="w-full rounded border border-line bg-bg px-2 py-1.5 text-xs outline-none focus:border-run"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <p className="mb-2 truncate px-2 text-[11px] font-medium uppercase tracking-wide text-text-muted">
          {apiName}
        </p>
        {discovering && endpoints.length === 0 ? (
          <EndpointTreeSkeleton />
        ) : visible.length === 0 ? (
          <p className="px-2 py-4 text-xs text-text-muted">
            No endpoints yet. Import an OpenAPI or Swagger spec to add POST, PUT, and DELETE routes.
          </p>
        ) : (
          visible.map((ep) => {
            const href = `/projects/${projectId}/endpoints/${ep.id}`;
            const active = pathname === href;
            return (
              <Link
                key={ep.id}
                href={href}
                className={`flex min-w-0 items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-bg ${
                  active ? "bg-bg" : ""
                }`}
              >
                <MethodBadge method={ep.method} />
                <span className="min-w-0 truncate font-mono text-text">{ep.path}</span>
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
}
