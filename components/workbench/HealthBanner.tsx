import type { HealthStatus } from "@/lib/workbench-health";
import { HealthBadge } from "./HealthBadge";

export function HealthBanner({
  summary,
}: {
  summary: {
    score: number;
    status: HealthStatus;
    endpointCount: number;
    healthyCount: number;
    warningCount: number;
    unhealthyCount: number;
    avgLatencyMs: number;
    lastRunAt: string;
  };
}) {
  const bg =
    summary.status === "healthy"
      ? "bg-healthy-soft"
      : summary.status === "warning"
        ? "bg-warning-soft"
        : "bg-unhealthy-soft";

  return (
    <section className={`rounded-md border border-line p-6 ${bg}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HealthBadge status={summary.status} />
            <span className="text-xs text-text-muted">Live · Last run {summary.lastRunAt}</span>
          </div>
          <p className="mt-2 text-[28px] font-semibold leading-none text-text">
            {summary.score} / 100
          </p>
        </div>
      </div>
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-text">
        <Stat label="Endpoints" value={summary.endpointCount} />
        <Stat label="Healthy" value={summary.healthyCount} />
        <Stat label="Warning" value={summary.warningCount} />
        <Stat label="Unhealthy" value={summary.unhealthyCount} />
        <Stat label="Avg" value={`${summary.avgLatencyMs} ms`} />
      </dl>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
