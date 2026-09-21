import Link from "next/link";
import type { IncidentRow } from "@/lib/project-context";
import { MethodBadge } from "@/components/MethodBadge";

export function IncidentRail({
  projectId,
  incidents,
}: {
  projectId: string;
  incidents: IncidentRow[];
}) {
  return (
    <aside className="hidden h-full w-72 shrink-0 overflow-y-auto border-l border-line bg-surface xl:block">
      <div className="border-b border-line px-4 py-3 text-xs font-medium uppercase tracking-wide text-text-muted">
        Incident history
      </div>
      {incidents.length === 0 ? (
        <p className="px-4 py-6 text-xs text-text-muted">No open incidents in this run.</p>
      ) : (
        <ul>
          {incidents.map((inc) => (
            <li key={inc.id} className="border-b border-line">
              <Link href={`/projects/${projectId}/incidents/${inc.id}`} className="block px-4 py-3 hover:bg-bg">
                <p className="text-[11px] text-text-muted">
                  {new Date(inc.detectedAt).toLocaleTimeString()}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-text">
                  <MethodBadge method={inc.method} />
                  <span className="truncate font-mono text-xs">{inc.path}</span>
                </p>
                <p className="mt-1 text-xs text-unhealthy">{inc.statusCode ?? "timeout"}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
