"use client";

import { useRouter } from "next/navigation";
import { classifyHealth, scoreFromCounts } from "@/lib/workbench-health";
import { summarizeOutcomes } from "@/lib/outcome";
import { useProject } from "@/lib/project-context";
import { HealthBadge } from "@/components/workbench/HealthBadge";
import { PageHeader } from "@/components/workbench/PageHeader";

export default function HistoryPage() {
  const { runs, selectRun, projectId } = useProject();
  const router = useRouter();

  return (
    <div>
      <PageHeader title="Test history" />
      {runs.length === 0 ? (
        <p className="text-sm text-text-muted">No checks yet. Run a health check from the header.</p>
      ) : (
        <div className="wb-scroll">
          <table className="wb-table">
            <thead>
              <tr>
                <th className="w-20">Run</th>
                <th className="w-28">Endpoints</th>
                <th className="w-20">Score</th>
                <th className="w-40">Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run, index) => {
                const counts = {
                  workingCount: run.workingCount ?? 0,
                  brokenCount: run.brokenCount ?? 0,
                  skippedCount: run.skippedCount ?? 0,
                  manualCount: run.manualCount ?? 0,
                };
                const endpointCount =
                  counts.workingCount + counts.brokenCount + counts.skippedCount + counts.manualCount ||
                  summarizeOutcomes(run.results ?? []).workingCount;
                const score = scoreFromCounts(counts);
                const status = classifyHealth(score);
                return (
                  <tr
                    key={run.id}
                    className="cursor-pointer"
                    onClick={() => {
                      void selectRun(run.id).then(() => router.push(`/projects/${projectId}`));
                    }}
                  >
                    <td>#{runs.length - index}</td>
                    <td>{endpointCount || "—"}</td>
                    <td>{score}</td>
                    <td>
                      <HealthBadge status={status} />
                      {run.dryRun && <span className="ml-2 text-xs text-text-muted">dry run</span>}
                    </td>
                    <td className="truncate text-text-muted">
                      {new Date(run.finishedAt ?? run.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
