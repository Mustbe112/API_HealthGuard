import { Request, Response, RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { startProjectTests } from "../services/runner/runner.service";
import { summarizeOutcomes } from "../services/runner/outcome";

function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

const runOptionsSchema = z.object({
  dryRun: z.boolean().optional().default(false),
});

async function assertProjectOwnership(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: userId } });
  return project;
}

function summarizeResults(
  results: { passed: boolean; statusCode: number | null; endpointId?: string }[]
) {
  return summarizeOutcomes(results);
}

async function triggerRunHandler(req: Request, res: Response) {
  const { projectId } = req.params;
  const project = await assertProjectOwnership(projectId, req.user!.userId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const parsed = runOptionsSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const testRunId = await startProjectTests(projectId, parsed.data.dryRun);

  const testRun = await prisma.testRun.findUnique({
    where: { id: testRunId },
    include: { results: { include: { endpoint: true }, orderBy: { createdAt: "asc" } } },
  });

  return res.status(202).json({
    testRun: testRun
      ? { ...testRun, ...summarizeResults(testRun.results) }
      : testRun,
  });
}

async function getRunHandler(req: Request, res: Response) {
  const { projectId, runId } = req.params;
  const project = await assertProjectOwnership(projectId, req.user!.userId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const testRun = await prisma.testRun.findFirst({
    where: { id: runId, projectId },
    include: { results: { include: { endpoint: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!testRun) return res.status(404).json({ error: "Test run not found" });

  return res.status(200).json({ testRun: { ...testRun, ...summarizeResults(testRun.results) } });
}

async function listRunsHandler(req: Request, res: Response) {
  const { projectId } = req.params;
  const project = await assertProjectOwnership(projectId, req.user!.userId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const rows = await prisma.testRun.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: { results: { select: { passed: true, statusCode: true, endpointId: true } } },
  });

  const testRuns = rows.map(({ results, ...run }) => ({
    ...run,
    ...summarizeResults(results),
  }));

  return res.status(200).json({ testRuns });
}

export const triggerRun = asyncHandler(triggerRunHandler);
export const getRun = asyncHandler(getRunHandler);
export const listRuns = asyncHandler(listRunsHandler);
