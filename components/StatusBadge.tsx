import type { ProbeOutcome } from "@/lib/outcome";

interface Props {
  outcome: ProbeOutcome;
}

const LABEL: Record<ProbeOutcome, string> = {
  working: "Working",
  broken: "Broken",
  manual: "Try manually",
  skipped: "Skipped",
};

const TONE: Record<ProbeOutcome, string> = {
  working: "text-pass",
  broken: "text-fail",
  manual: "text-pending",
  skipped: "text-pending",
};

const DOT: Record<ProbeOutcome, string> = {
  working: "bg-pass",
  broken: "bg-fail",
  manual: "bg-pending",
  skipped: "bg-pending",
};

export function StatusBadge({ outcome }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${TONE[outcome]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[outcome]}`} />
      {LABEL[outcome]}
    </span>
  );
}
