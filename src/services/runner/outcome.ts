/** How a zero-input probe should be shown — not the raw HTTP code. */

export type ProbeOutcome = "working" | "broken" | "manual" | "skipped";

export function classifyOutcome(result: {
  passed: boolean;
  statusCode: number | null;
}): ProbeOutcome {
  const status = result.statusCode;

  if (status === null) {
    return result.passed ? "skipped" : "broken";
  }

  // Auth gates: the route is up, but this run could not finish the real call.
  if (status === 401 || status === 403) return "manual";

  if (status >= 500) return "broken";

  if (result.passed) return "working";

  return "broken";
}

export function summarizeOutcomes(
  results: { passed: boolean; statusCode: number | null }[]
): {
  workingCount: number;
  brokenCount: number;
  skippedCount: number;
  manualCount: number;
} {
  let workingCount = 0;
  let brokenCount = 0;
  let skippedCount = 0;
  let manualCount = 0;
  for (const r of results) {
    switch (classifyOutcome(r)) {
      case "working":
        workingCount += 1;
        break;
      case "broken":
        brokenCount += 1;
        break;
      case "skipped":
        skippedCount += 1;
        break;
      case "manual":
        manualCount += 1;
        break;
    }
  }
  return { workingCount, brokenCount, skippedCount, manualCount };
}

export function manualMessage(status: number): string {
  if (status === 401) {
    return "Got 401 — the route is live but needs a real login. Open Try endpoints and send a token; this is not a crash.";
  }
  if (status === 403) {
    return "Got 403 — the route is live but this caller is not allowed. Try again with an account that has access.";
  }
  return `Got ${status} — the route responded, but you need to send real data in Try endpoints.`;
}
