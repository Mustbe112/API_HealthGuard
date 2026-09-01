import { classifyOutcome, type ProbeOutcome } from "./outcome";

export type HealthStatus = "healthy" | "warning" | "unhealthy";

export function healthFromOutcome(outcome: ProbeOutcome): HealthStatus {
  if (outcome === "working") return "healthy";
  if (outcome === "broken") return "unhealthy";
  return "warning";
}

export function healthFromResult(result: { passed: boolean; statusCode: number | null }): HealthStatus {
  return healthFromOutcome(classifyOutcome(result));
}

export function scoreFromCounts(counts: {
  workingCount: number;
  brokenCount: number;
  skippedCount: number;
  manualCount: number;
}): number {
  const total = counts.workingCount + counts.brokenCount + counts.skippedCount + counts.manualCount;
  if (total === 0) return 0;
  const points = counts.workingCount * 100 + counts.manualCount * 50 + counts.skippedCount * 50;
  return Math.round(points / total);
}

export function classifyHealth(score: number, healthyMin = 90, warningMin = 70): HealthStatus {
  if (score >= healthyMin) return "healthy";
  if (score >= warningMin) return "warning";
  return "unhealthy";
}

export function formatLatency(ms: number | null): string {
  if (ms == null) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms)} ms`;
}
