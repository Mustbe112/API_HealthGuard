"use client";

import type { ReactNode } from "react";
import { classifyOutcome } from "@/lib/outcome";
import { healthFromOutcome, scoreFromCounts } from "@/lib/workbench-health";
import type { TestResult, TestRun } from "@/lib/types";

type Counts = {
  workingCount: number;
  brokenCount: number;
  skippedCount: number;
  manualCount: number;
};

export function HealthCharts({
  counts,
  results,
  runs,
}: {
  counts: Counts;
  results: TestResult[];
  runs: TestRun[];
}) {
  const total = counts.workingCount + counts.manualCount + counts.brokenCount + counts.skippedCount;
  const history = [...runs].slice(0, 12).reverse();
  const slowest = [...results]
    .filter((r) => r.responseTimeMs != null)
    .sort((a, b) => (b.responseTimeMs ?? 0) - (a.responseTimeMs ?? 0))
    .slice(0, 8);
  const maxMs = Math.max(1, ...slowest.map((r) => r.responseTimeMs ?? 0));

  if (total === 0 && history.length === 0) return null;

  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-3">
      <ChartCard title="Health mix">
        {total === 0 ? (
          <p className="text-xs text-text-muted">Run a health check to see the split.</p>
        ) : (
          <div className="flex items-center gap-5">
            <Donut
              slices={[
                { value: counts.workingCount, color: "var(--color-healthy)" },
                { value: counts.manualCount, color: "var(--color-warning)" },
                { value: counts.brokenCount, color: "var(--color-unhealthy)" },
                { value: counts.skippedCount, color: "var(--color-text-muted)" },
              ]}
              label={`${Math.round((counts.workingCount / total) * 100)}%`}
              hint="working"
            />
            <ul className="space-y-1.5 text-xs">
              <Legend swatch="bg-healthy" label="Working" value={counts.workingCount} />
              <Legend swatch="bg-warning" label="Needs a login" value={counts.manualCount} />
              <Legend swatch="bg-unhealthy" label="Broken" value={counts.brokenCount} />
            </ul>
          </div>
        )}
      </ChartCard>

      <ChartCard title="Score over time">
        {history.length < 2 ? (
          <p className="text-xs text-text-muted">Run a couple of checks to see the trend.</p>
        ) : (
          <ScoreSparkline runs={history} />
        )}
      </ChartCard>

      <ChartCard title="Slowest routes">
        {slowest.length === 0 ? (
          <p className="text-xs text-text-muted">No latency data yet.</p>
        ) : (
          <div className="space-y-2">
            {slowest.map((r) => {
              const health = healthFromOutcome(classifyOutcome(r));
              const bar =
                health === "unhealthy" ? "bg-unhealthy" : health === "healthy" ? "bg-healthy" : "bg-warning";
              const width = Math.max(6, ((r.responseTimeMs ?? 0) / maxMs) * 100);
              return (
                <div key={r.id} className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                    <span className="truncate text-text">
                      {r.endpoint.method} {r.endpoint.path}
                    </span>
                    <span className="shrink-0 text-text-muted">{r.responseTimeMs}ms</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-panel-raised">
                    <div className={`h-full rounded-full ${bar}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex min-h-[220px] flex-col overflow-hidden rounded-md border border-line bg-surface p-4">
      <h2 className="mb-3 shrink-0 text-sm font-medium text-text">{title}</h2>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  );
}

function Legend({ swatch, label, value }: { swatch: string; label: string; value: number }) {
  return (
    <li className="flex items-center gap-2 text-text-muted">
      <span className={`h-2 w-2 rounded-full ${swatch}`} />
      {label}
      <span className="ml-auto font-mono text-text">{value}</span>
    </li>
  );
}

function Donut({
  slices,
  label,
  hint,
}: {
  slices: { value: number; color: string }[];
  label: string;
  hint: string;
}) {
  const size = 112;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
      {slices.map((slice, i) => {
        if (!slice.value) return null;
        const len = (slice.value / total) * c;
        const dash = `${len} ${c - len}`;
        const el = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={slice.color}
            strokeWidth={stroke}
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
        offset += len;
        return el;
      })}
      <text x="50%" y="48%" textAnchor="middle" className="fill-text" fontSize="16" fontWeight="600">
        {label}
      </text>
      <text x="50%" y="62%" textAnchor="middle" className="fill-text-muted" fontSize="9">
        {hint}
      </text>
    </svg>
  );
}

function ScoreSparkline({ runs }: { runs: TestRun[] }) {
  const points = runs.map((run, i) => {
    const counts = {
      workingCount: run.workingCount ?? 0,
      brokenCount: run.brokenCount ?? 0,
      skippedCount: run.skippedCount ?? 0,
      manualCount: run.manualCount ?? 0,
    };
    return { x: i, y: scoreFromCounts(counts) };
  });
  const w = 280;
  const h = 112;
  const pad = 8;
  const xs = points.map((_, i) => pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2));
  const ys = points.map((p) => pad + (1 - p.y / 100) * (h - pad * 2));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const area = `${d} L${xs[xs.length - 1].toFixed(1)},${h - pad} L${xs[0].toFixed(1)},${h - pad} Z`;
  const last = points[points.length - 1]?.y ?? 0;

  return (
    <div>
      <p className="mb-2 text-2xl font-semibold text-text">{last}</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full" aria-hidden>
        <path d={area} fill="var(--color-run)" opacity="0.12" />
        <path d={d} fill="none" stroke="var(--color-run)" strokeWidth="2" />
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r="2.5" fill="var(--color-run)" />
        ))}
      </svg>
      <p className="mt-1 text-[11px] text-text-muted">Last {runs.length} checks · 0–100 score</p>
    </div>
  );
}
