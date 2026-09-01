"use client";

import { useRouter } from "next/navigation";
import { classifyHealth, scoreFromCounts } from "@/lib/workbench-health";
import { summarizeOutcomes } from "@/lib/outcome";
import { useProject } from "@/lib/project-context";
import { HealthBadge } from "@/components/workbench/HealthBadge";

export default function HistoryPage() {
  const { runs, selectRun, projectId } = useProject();
  const router = useRouter();

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-text">Test history</h1>
      <div className="rounded-md border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-2 font-medium">Run</th>
              <th className="px-4 py-2 font-medium">Endpoints</th>
              <th className="px-4 py-2 font-medium">Score</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Date</th>
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
                  className="cursor-pointer border-b border-line last:border-0 hover:bg-bg"
                  onClick={() => {
                    void selectRun(run.id).then(() => router.push(`/projects/${projectId}`));
                  }}
                >
                  <td className="px-4 py-2">#{runs.length - index}</td>
                  <td className="px-4 py-2">{endpointCount || "—"}</td>
                  <td className="px-4 py-2">{score}</td>
                  <td className="px-4 py-2">
                    <HealthBadge status={status} />
                    {run.dryRun && <span className="ml-2 text-xs text-text-muted">dry run</span>}
                  </td>
                  <td className="px-4 py-2 text-text-muted">
                    {new Date(run.finishedAt ?? run.createdAt).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
