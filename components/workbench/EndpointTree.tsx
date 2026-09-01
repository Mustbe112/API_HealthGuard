"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Endpoint } from "@/lib/types";
import { MethodBadge } from "@/components/MethodBadge";

export function EndpointTree({
  projectId,
  apiName,
  endpoints,
  onImport,
  onNew,
}: {
  projectId: string;
  apiName: string;
  endpoints: Endpoint[];
  onImport: () => void;
  onNew: () => void;
}) {
  const [q, setQ] = useState("");
  const pathname = usePathname();
  const visible = endpoints.filter((e) => `${e.method} ${e.path}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex gap-2 border-b border-line p-3">
        <button
          type="button"
          onClick={onImport}
          className="flex-1 rounded border border-line px-2 py-1 text-xs text-text hover:bg-bg"
        >
          Import
        </button>
        <button
          type="button"
          onClick={onNew}
          className="flex-1 rounded border border-line px-2 py-1 text-xs text-text hover:bg-bg"
        >
          New
        </button>
      </div>
      <div className="border-b border-line p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          className="w-full rounded border border-line bg-bg px-2 py-1.5 text-xs outline-none focus:border-run"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <p className="mb-1 truncate px-2 text-xs font-medium text-text">{apiName}</p>
        {visible.length === 0 ? (
          <p className="px-2 py-4 text-xs text-text-muted">
            No endpoints yet. Import a spec or enter an API Base URL.
          </p>
        ) : (
          visible.map((ep) => {
            const href = `/projects/${projectId}/endpoints/${ep.id}`;
            const active = pathname === href;
            return (
              <Link
                key={ep.id}
                href={href}
                className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-bg ${
                  active ? "bg-bg" : ""
                }`}
              >
                <MethodBadge method={ep.method} />
                <span className="truncate font-mono text-text">{ep.path}</span>
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
}
