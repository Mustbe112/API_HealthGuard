/** How a zero-input probe should be shown — not the raw HTTP code. */

export type ProbeOutcome = "working" | "broken" | "manual" | "skipped";

/** Broken beats needs-login, which beats skipped, which beats working. */
export const OUTCOME_RANK: Record<ProbeOutcome, number> = {
  broken: 3,
  manual: 2,
  skipped: 1,
  working: 0,
};

export function isWorseOutcome(next: ProbeOutcome, current: ProbeOutcome): boolean {
  return OUTCOME_RANK[next] > OUTCOME_RANK[current];
}

export function pickWorseResult<T extends { passed: boolean; statusCode: number | null }>(
  results: T[]
): T | undefined {
  let chosen: T | undefined;
  for (const result of results) {
    if (!chosen || isWorseOutcome(classifyOutcome(result), classifyOutcome(chosen))) {
      chosen = result;
    }
  }
  return chosen;
}

export function rollupResultsByEndpoint<
  T extends { endpointId: string; passed: boolean; statusCode: number | null },
>(results: T[]): T[] {
  const chosen = new Map<string, T>();
  for (const result of results) {
    const prev = chosen.get(result.endpointId);
    if (!prev || isWorseOutcome(classifyOutcome(result), classifyOutcome(prev))) {
      chosen.set(result.endpointId, result);
    }
  }
  return [...chosen.values()];
}

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
  results: { passed: boolean; statusCode: number | null; endpointId?: string }[]
): {
  workingCount: number;
  brokenCount: number;
  skippedCount: number;
  manualCount: number;
} {
  const canRollup = results.length > 0 && results.every((r) => typeof r.endpointId === "string");
  const rows = canRollup
    ? rollupResultsByEndpoint(
        results as { endpointId: string; passed: boolean; statusCode: number | null }[]
      )
    : results;
  let workingCount = 0;
  let brokenCount = 0;
  let skippedCount = 0;
  let manualCount = 0;
  for (const r of rows) {
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
