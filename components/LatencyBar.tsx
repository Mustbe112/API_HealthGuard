interface Props {
  ms: number | null;
  maxMs: number;
  passed: boolean;
}

export function LatencyBar({ ms, maxMs, passed }: Props) {
  if (ms === null) {
    return <span className="font-mono text-xs text-text-muted">—</span>;
  }

  const widthPct = maxMs > 0 ? Math.max(4, Math.min(100, (ms / maxMs) * 100)) : 4;

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-panel-raised">
        <div
          className={`h-full rounded-full ${passed ? "bg-pass" : "bg-fail"}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <span className="font-mono text-xs tabular-nums text-text-muted">{ms}ms</span>
    </div>
  );
}
