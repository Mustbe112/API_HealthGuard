import { env } from "../../config/env";
import { prisma } from "../../db/client";
import { classifyOutcome, rollupResultsByEndpoint, type ProbeOutcome } from "../runner/outcome";

export class ExplainConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExplainConfigError";
  }
}

export class ExplainFailedError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
    this.name = "ExplainFailedError";
  }
}

const OUTCOME_LABEL: Record<ProbeOutcome, string> = {
  working: "Working",
  manual: "Needs a login",
  broken: "Broken",
  skipped: "Skipped",
};

const SENSITIVE_HEADER = /^(authorization|cookie|set-cookie|x-api-key|x-auth-token)$/i;

function clip(value: string, max = 220): string {
  const t = value.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function safeHeaders(headers?: Record<string, string> | null): Record<string, string> {
  if (!headers) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] = SENSITIVE_HEADER.test(key) ? "[redacted]" : clip(String(value), 80);
  }
  return out;
}

function outcomeOf(result: { passed: boolean; statusCode: number | null }): ProbeOutcome {
  return classifyOutcome(result);
}

export async function explainHealthCheck(opts: {
  projectId: string;
  ownerId: string;
  runId?: string;
  endpointId?: string;
}): Promise<string> {
  if (!env.groqApiKey) {
    throw new ExplainConfigError(
      "Add GROQ_API_KEY to the repo-root .env file, then restart the backend."
    );
  }

  const project = await prisma.project.findFirst({
    where: { id: opts.projectId, ownerId: opts.ownerId },
    select: { id: true, name: true, baseUrl: true },
  });
  if (!project) throw new ExplainFailedError("Project not found", 404);

  const testRun = opts.runId
    ? await prisma.testRun.findFirst({
        where: { id: opts.runId, projectId: project.id },
        include: { results: { include: { endpoint: true }, orderBy: { createdAt: "asc" } } },
      })
    : await prisma.testRun.findFirst({
        where: { projectId: project.id, status: { in: ["COMPLETED", "FAILED"] } },
        orderBy: { createdAt: "desc" },
        include: { results: { include: { endpoint: true }, orderBy: { createdAt: "asc" } } },
      });

  if (!testRun || testRun.results.length === 0) {
    throw new ExplainFailedError("Run a health check first, then ask for an explanation.");
  }

  const results = rollupResultsByEndpoint(
    opts.endpointId
      ? testRun.results.filter((r) => r.endpointId === opts.endpointId)
      : testRun.results
  );
  if (results.length === 0) {
    throw new ExplainFailedError("No result for that endpoint in this run.");
  }

  const counts = { working: 0, login: 0, broken: 0, skipped: 0 };
  const rows = results.map((r) => {
    const outcome = outcomeOf(r);
    if (outcome === "working") counts.working += 1;
    else if (outcome === "manual") counts.login += 1;
    else if (outcome === "skipped") counts.skipped += 1;
    else counts.broken += 1;

    const probe =
      r.probe && typeof r.probe === "object" && !Array.isArray(r.probe)
        ? (r.probe as {
            sent?: string;
            proves?: string;
            caution?: string;
            request?: { method?: string; url?: string; headers?: Record<string, string> };
          })
        : null;

    return {
      method: r.endpoint.method,
      path: r.endpoint.path,
      status: r.statusCode,
      outcome: OUTCOME_LABEL[outcome],
      error: r.errorMessage ? clip(r.errorMessage) : null,
      proves: probe?.proves ? clip(probe.proves) : null,
      sent: probe?.sent ? clip(probe.sent) : null,
      request: probe?.request
        ? {
            method: probe.request.method,
            url: probe.request.url,
            headers: safeHeaders(probe.request.headers),
          }
        : null,
    };
  });

  const focus = opts.endpointId
    ? rows
    : rows.filter((r) => r.outcome !== "Working").slice(0, 24);

  const payload = {
    project: project.name,
    host: project.baseUrl,
    scope: opts.endpointId ? "one endpoint" : "whole run",
    counts,
    routes: focus,
  };

  const system = [
    "You explain API health-check results like a helpful teammate talking to a human.",
    "Write 1 or 2 short paragraphs in plain English. No headings, bullets, numbered lists, or markdown.",
    "Working means the route answered as expected. Needs a login means 401/403 — the route is up. Broken means 5xx or no response.",
    "Say what looks fine, what needs a real login, and what is actually broken. If something is broken, mention one clear next step in the same paragraph.",
    "Keep it under 90 words. Do not invent routes. Do not ask for or repeat secrets. Do not mention Groq or that you are an AI.",
  ].join(" ");

  const user = opts.endpointId
    ? `Explain why this one route looks the way it does:\n${JSON.stringify(payload)}`
    : `Explain this health check. Focus on what the person should do next:\n${JSON.stringify(payload)}`;

  return callGroq(system, user);
}

const MODEL_FALLBACKS = ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.6-27b"];

function explanationFromMessage(message?: {
  content?: string | null;
  reasoning?: string | null;
  reasoning_content?: string | null;
} | null): string {
  const parts = [message?.content, message?.reasoning_content, message?.reasoning];
  for (const part of parts) {
    const text = typeof part === "string" ? part.trim() : "";
    if (text) return text;
  }
  return "";
}

function shortenExplanation(text: string): string {
  const cleaned = text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 2);
  return paragraphs.join("\n\n");
}

async function callGroq(system: string, user: string): Promise<string> {
  const models = [env.groqModel, ...MODEL_FALLBACKS.filter((m) => m !== env.groqModel)];
  let lastError = "Could not reach Groq.";

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          max_tokens: 280,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
        signal: controller.signal,
      });
      const body = (await res.json().catch(() => null)) as {
        error?: { message?: string };
        choices?: {
          message?: {
            content?: string | null;
            reasoning?: string | null;
            reasoning_content?: string | null;
          };
        }[];
      } | null;

      if (res.ok) {
        const text = explanationFromMessage(body?.choices?.[0]?.message);
        if (!text) throw new ExplainFailedError("Groq returned an empty explanation.", 502);
        return shortenExplanation(text);
      }

      lastError = body?.error?.message ?? `Groq returned ${res.status}`;
      if (!/does not exist|do not have access|model_not_found/i.test(lastError)) {
        throw new ExplainFailedError(lastError, 502);
      }
    } catch (err: any) {
      if (err instanceof ExplainFailedError) throw err;
      if (err?.name === "AbortError") {
        throw new ExplainFailedError("Groq timed out. Try again.", 502);
      }
      throw new ExplainFailedError(err?.message ?? "Could not reach Groq.", 502);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new ExplainFailedError(lastError, 502);
}
