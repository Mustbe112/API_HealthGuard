import { Request, Response, RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { setVariable, listVariablesMasked } from "../services/environmentVariable.service";

function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

async function assertProjectOwnership(projectId: string, userId: string) {
  return prisma.project.findFirst({ where: { id: projectId, ownerId: userId } });
}

const setVariableSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Use a plain identifier, e.g. API_TOKEN or base_url"),
  value: z.string().min(1),
  isSecret: z.boolean().optional().default(true),
});

async function setVariableHandler(req: Request, res: Response) {
  const { projectId } = req.params;
  const project = await assertProjectOwnership(projectId, req.user!.userId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const parsed = setVariableSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  await setVariable({ projectId, ...parsed.data });

  // Return the masked list, never the value that was just set — even
  // echoing back what the client already sent trains bad habits (logs,
  // browser history, etc. capturing secrets in responses).
  const variables = await listVariablesMasked(projectId);
  return res.status(200).json({ variables });
}

async function listVariablesHandler(req: Request, res: Response) {
  const { projectId } = req.params;
  const project = await assertProjectOwnership(projectId, req.user!.userId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const variables = await listVariablesMasked(projectId);
  return res.status(200).json({ variables });
}

async function deleteVariableHandler(req: Request, res: Response) {
  const { projectId, key } = req.params;
  const project = await assertProjectOwnership(projectId, req.user!.userId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  await prisma.environmentVariable.deleteMany({ where: { projectId, key } });
  const variables = await listVariablesMasked(projectId);
  return res.status(200).json({ variables });
}

export const setProjectVariable = asyncHandler(setVariableHandler);
export const listProjectVariables = asyncHandler(listVariablesHandler);
export const deleteProjectVariable = asyncHandler(deleteVariableHandler);
