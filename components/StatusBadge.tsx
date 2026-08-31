interface Props {
  passed: boolean;
  skipped?: boolean;
}

export function StatusBadge({ passed, skipped }: Props) {
  if (skipped) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-pending">
        <span className="h-1.5 w-1.5 rounded-full bg-pending" />
        Skipped
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${passed ? "text-pass" : "text-fail"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${passed ? "bg-pass" : "bg-fail"}`} />
      {passed ? "Working" : "Broken"}
    </span>
  );
}
