import type { HealthStatus } from "@/lib/workbench-health";

const TONE: Record<HealthStatus, string> = {
  healthy: "bg-healthy-soft text-healthy",
  warning: "bg-warning-soft text-warning",
  unhealthy: "bg-unhealthy-soft text-unhealthy",
};

const LABEL: Record<HealthStatus, string> = {
  healthy: "HEALTHY",
  warning: "WARNING",
  unhealthy: "UNHEALTHY",
};

export function HealthBadge({ status }: { status: HealthStatus }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium tracking-wide ${TONE[status]}`}>
      {LABEL[status]}
    </span>
  );
}
