interface Props {
  ms: number | null;
  maxMs: number;
  tone?: "pass" | "fail" | "pending";
}

export function LatencyBar({ ms, maxMs, tone = "pass" }: Props) {
  if (ms === null) {
    return <span className="font-mono text-xs text-text-muted">—</span>;
  }

  const widthPct = maxMs > 0 ? Math.max(4, Math.min(100, (ms / maxMs) * 100)) : 4;
  const bar = tone === "fail" ? "bg-fail" : tone === "pending" ? "bg-pending" : "bg-pass";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-panel-raised">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${widthPct}%` }} />
      </div>
      <span className="font-mono text-xs tabular-nums text-text-muted">{ms}ms</span>
    </div>
  );
}
