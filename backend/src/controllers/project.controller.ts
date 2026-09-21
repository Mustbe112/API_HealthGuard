import { Request, Response, RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../db/client";

function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

const createProjectSchema = z.object({
  name: z.string().min(1),
  baseUrl: z.string().url(),
});

async function createProjectHandler(req: Request, res: Response) {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const project = await prisma.project.create({
    data: { ...parsed.data, ownerId: req.user!.userId },
  });
  return res.status(201).json({ project });
}

async function listProjectsHandler(req: Request, res: Response) {
  const projects = await prisma.project.findMany({
    where: { ownerId: req.user!.userId },
    orderBy: { createdAt: "desc" },
  });
  return res.status(200).json({ projects });
}

async function getProjectHandler(req: Request, res: Response) {
  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, ownerId: req.user!.userId },
    include: { endpoints: { orderBy: [{ path: "asc" }, { method: "asc" }] } },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });
  return res.status(200).json({ project });
}

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  baseUrl: z.string().url().optional(),
});

async function updateProjectHandler(req: Request, res: Response) {
  const { projectId } = req.params;
  const existing = await prisma.project.findFirst({
    where: { id: projectId, ownerId: req.user!.userId },
  });
  if (!existing) return res.status(404).json({ error: "Project not found" });

  const parsed = updateProjectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (parsed.data.baseUrl !== undefined) {
    return res.status(409).json({
      error:
        "API Base URL is locked after the project is created. Create a new project to monitor a different API.",
    });
  }
  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: parsed.data,
    include: { endpoints: { orderBy: [{ path: "asc" }, { method: "asc" }] } },
  });
  return res.status(200).json({ project });
}

const updateEndpointSchema = z.object({
  dependsOnId: z.string().uuid().nullable().optional(),
  expectedStatus: z.number().int().optional(),
});

async function updateEndpointHandler(req: Request, res: Response) {
  const { projectId, endpointId } = req.params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: req.user!.userId },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const endpoint = await prisma.endpoint.findFirst({ where: { id: endpointId, projectId } });
  if (!endpoint) return res.status(404).json({ error: "Endpoint not found" });

  const parsed = updateEndpointSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (parsed.data.dependsOnId) {
    // Must reference another endpoint in the same project, and can't
    // depend on itself (that would create a 1-node cycle).
    if (parsed.data.dependsOnId === endpointId) {
      return res.status(400).json({ error: "An endpoint cannot depend on itself" });
    }
    const dependency = await prisma.endpoint.findFirst({
      where: { id: parsed.data.dependsOnId, projectId },
    });
    if (!dependency) {
      return res.status(400).json({ error: "dependsOnId must reference an endpoint in the same project" });
    }
  }

  const updated = await prisma.endpoint.update({
    where: { id: endpointId },
    data: parsed.data,
  });
  return res.status(200).json({ endpoint: updated });
}

async function deleteProjectHandler(req: Request, res: Response) {
  const { projectId } = req.params;
  const existing = await prisma.project.findFirst({
    where: { id: projectId, ownerId: req.user!.userId },
  });
  if (!existing) return res.status(404).json({ error: "Project not found" });

  await prisma.project.delete({ where: { id: projectId } });
  return res.status(200).json({ ok: true });
}

export const createProject = asyncHandler(createProjectHandler);
export const listProjects = asyncHandler(listProjectsHandler);
export const getProject = asyncHandler(getProjectHandler);
export const updateProject = asyncHandler(updateProjectHandler);
export const updateEndpoint = asyncHandler(updateEndpointHandler);
export const deleteProject = asyncHandler(deleteProjectHandler);
