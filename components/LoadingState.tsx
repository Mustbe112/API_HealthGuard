"use client";

import { useEffect, useState } from "react";

const DISCOVER_STEPS = [
  "Resolving the host",
  "Looking for OpenAPI / Swagger",
  "Probing live JSON routes",
  "Mapping methods and paths",
];

const RUN_STEPS = [
  "Preparing throwaway requests",
  "Hitting each discovered route",
  "Scoring working vs broken",
  "Building the health map",
];

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`hg-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6">
      <LogoPulse />
      <p className="text-sm text-text-muted">{label}</p>
    </div>
  );
}

export function ProjectListSkeleton() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Loading projects">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-md border border-line bg-surface px-5 py-4">
          <div className="hg-shimmer h-4 w-40 rounded" />
          <div className="hg-shimmer mt-2 h-3 w-64 max-w-full rounded" />
        </div>
      ))}
    </div>
  );
}

export function EndpointTreeSkeleton() {
  return (
    <div className="space-y-2 px-2 py-2" aria-busy="true" aria-label="Discovering endpoints">
      {[72, 56, 80, 48, 64].map((w, i) => (
        <div key={i} className="flex items-center gap-2 rounded px-2 py-1.5">
          <div className="hg-shimmer h-4 w-10 shrink-0 rounded" />
          <div className="hg-shimmer h-3 rounded" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}

export function ProbeLoader({
  title = "Connecting to your API",
  message,
  baseUrl,
  phase = "discover",
}: {
  title?: string;
  message?: string | null;
  baseUrl?: string | null;
  phase?: "discover" | "run";
}) {
  const steps = phase === "run" ? RUN_STEPS : DISCOVER_STEPS;
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStep((n) => (n + 1) % steps.length);
    }, 1400);
    return () => window.clearInterval(id);
  }, [steps.length]);

  return (
    <div
      className="mx-auto w-full max-w-lg rounded-xl border border-line bg-surface px-6 py-10 text-center shadow-[0_24px_60px_-40px_rgba(11,18,32,0.45)]"
      role="status"
      aria-live="polite"
    >
      <LogoPulse />
      <h2 className="mt-5 font-display text-lg font-semibold text-text">{title}</h2>
      {baseUrl ? (
        <p className="mt-1 truncate font-mono text-xs text-text-muted">{baseUrl}</p>
      ) : null}
      <p className="mt-3 text-sm text-text-muted">{message || steps[step]}</p>

      <div className="hg-scan mx-auto mt-6 h-1 w-full max-w-xs overflow-hidden rounded-full bg-line" />

      <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left">
        {steps.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <li
              key={label}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-xs transition-colors ${
                active ? "bg-bg text-text" : "text-text-muted"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full border text-[9px] ${
                  done
                    ? "border-healthy bg-healthy text-white"
                    : active
                      ? "border-run text-run"
                      : "border-line"
                }`}
              >
                {done ? "✓" : active ? <Spinner className="h-2.5 w-2.5" /> : i + 1}
              </span>
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LogoPulse() {
  return (
    <div className="relative mx-auto h-14 w-14">
      <span className="hg-pulse-ring absolute inset-0 rounded-xl bg-run/30" />
      <span className="hg-pulse-ring hg-pulse-ring-delay absolute inset-0 rounded-xl bg-run/20" />
      <span className="relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-run text-white">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden>
          <path
            d="M3 12h4l2-5 3 10 2-5h7"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}
