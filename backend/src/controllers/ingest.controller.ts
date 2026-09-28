import { Request, Response, RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { parseSpecText, UnsupportedSpecError } from "../services/parsers";
import { replaceProjectEndpoints } from "../services/endpoints.service";
import { getResolvedVariables } from "../services/environmentVariable.service";
import { summarizeOutcomes } from "../services/runner/outcome";

function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function isLocalHttpTarget(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
    if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
    if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)) return true;
    return false;
  } catch {
    return false;
  }
}

const endpointSchema = z.object({
  name: z.string().min(1),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
  path: z.string().min(1),
  expectedStatus: z.number().int(),
  documentedStatuses: z.array(z.number().int()),
  requiresAuth: z.boolean(),
});

const ingestEndpointsSchema = z.object({
  endpoints: z.array(endpointSchema).max(400),
});

const ingestSpecSchema = z.object({
  specText: z.string().min(1).max(5 * 1024 * 1024),
  filename: z.string().max(120).optional(),
});

const browserResultSchema = z.object({
  endpointId: z.string().uuid(),
  statusCode: z.number().int().nullable(),
  responseTimeMs: z.number().int().nullable(),
  passed: z.boolean(),
  errorMessage: z.string().nullable(),
  responseBody: z.unknown().optional(),
  probe: z
    .object({
      sent: z.string(),
      expected: z.array(z.number()),
      proves: z.string(),
      request: z
        .object({
          url: z.string(),
          method: z.string(),
          headers: z.record(z.string()),
          body: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

const completeRunSchema = z.object({
  results: z.array(browserResultSchema).max(400),
  status: z.enum(["COMPLETED", "FAILED"]).optional().default("COMPLETED"),
});

async function ingestSpecHandler(req: Request, res: Response) {
  const { projectId } = req.params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: req.user!.userId },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const parsed = ingestSpecSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  let spec;
  try {
    spec = parseSpecText(parsed.data.specText, parsed.data.filename ?? "openapi.json");
  } catch (err) {
    if (err instanceof UnsupportedSpecError) {
      return res.status(422).json({ error: err.message });
    }
    return res.status(422).json({ error: "Could not parse the spec from localhost." });
  }
  if (spec.endpoints.length === 0) {
    return res.status(422).json({ error: "No endpoints found in the spec." });
  }

  const created = await replaceProjectEndpoints(projectId, spec.endpoints);
  return res.status(200).json({ source: spec.format, count: created.length, endpoints: created });
}

async function ingestEndpointsHandler(req: Request, res: Response) {
  const { projectId } = req.params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: req.user!.userId },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const parsed = ingestEndpointsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (parsed.data.endpoints.length === 0) {
    return res.status(200).json({ source: "probe", count: 0, endpoints: [] });
  }

  const created = await replaceProjectEndpoints(projectId, parsed.data.endpoints);
  return res.status(200).json({ source: "probe", count: created.length, endpoints: created });
}

async function prepareBrowserRunHandler(req: Request, res: Response) {
  const { projectId } = req.params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: req.user!.userId },
    include: { endpoints: { orderBy: [{ path: "asc" }, { method: "asc" }] } },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!isLocalHttpTarget(project.baseUrl)) {
    return res.status(400).json({ error: "Browser runs are only for localhost / private Base URLs." });
  }

  const dryRun = Boolean((req.body as { dryRun?: boolean } | undefined)?.dryRun);
  const testRun = await prisma.testRun.create({
    data: { projectId, status: "RUNNING", dryRun, startedAt: new Date() },
  });
  const variables = await getResolvedVariables(projectId);
  return res.status(200).json({
    testRun: { ...testRun, workingCount: 0, brokenCount: 0, skippedCount: 0, manualCount: 0, results: [] },
    endpoints: project.endpoints,
    baseUrl: project.baseUrl,
    variables,
  });
}

async function completeBrowserRunHandler(req: Request, res: Response) {
  const { projectId, runId } = req.params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: req.user!.userId },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const testRun = await prisma.testRun.findFirst({ where: { id: runId, projectId } });
  if (!testRun) return res.status(404).json({ error: "Test run not found" });
  if (testRun.status !== "RUNNING") {
    return res.status(409).json({ error: "This run is no longer accepting results." });
  }

  const parsed = completeRunSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const endpointIds = new Set(
    (await prisma.endpoint.findMany({ where: { projectId }, select: { id: true } })).map((e) => e.id)
  );

  await prisma.$transaction(async (tx) => {
    for (const row of parsed.data.results) {
      if (!endpointIds.has(row.endpointId)) continue;
      await tx.testResult.create({
        data: {
          testRunId: runId,
          endpointId: row.endpointId,
          statusCode: row.statusCode,
          responseTimeMs: row.responseTimeMs,
          passed: row.passed,
          errorMessage: row.errorMessage,
          responseBody: row.responseBody as any,
          probe: row.probe as any,
        },
      });
    }
    await tx.testRun.update({
      where: { id: runId },
      data: { status: parsed.data.status, finishedAt: new Date() },
    });
  });

  const finished = await prisma.testRun.findUnique({
    where: { id: runId },
    include: { results: { include: { endpoint: true }, orderBy: { createdAt: "asc" } } },
  });
  return res.status(200).json({
    testRun: finished ? { ...finished, ...summarizeOutcomes(finished.results) } : finished,
  });
}

export const ingestSpec = asyncHandler(ingestSpecHandler);
export const ingestEndpoints = asyncHandler(ingestEndpointsHandler);
export const prepareBrowserRun = asyncHandler(prepareBrowserRunHandler);
export const completeBrowserRun = asyncHandler(completeBrowserRunHandler);
