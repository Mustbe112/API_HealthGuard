import { Request, Response, RequestHandler } from "express";
import { prisma } from "../db/client";
import { discoverEndpoints, UnreachableTargetError } from "../services/discovery/discover";
import { replaceProjectEndpoints } from "../services/endpoints.service";

function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

async function discoverSpecHandler(req: Request, res: Response) {
  const { projectId } = req.params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: req.user!.userId },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });

  let result;
  try {
    result = await discoverEndpoints(project.baseUrl);
  } catch (err) {
    if (err instanceof UnreachableTargetError) {
      return res.status(502).json({ error: err.message, count: 0, source: "none" });
    }
    throw err;
  }

  if (result.endpoints.length === 0) {
    return res.status(200).json({
      source: result.source,
      count: 0,
      specUrl: result.specUrl,
      endpoints: [],
      error:
        "Reached the server but found no OpenAPI/Swagger spec and no JSON API routes. Upload a spec, or check that this URL is the API (not the website).",
    });
  }

  const created = await replaceProjectEndpoints(projectId, result.endpoints);
  return res.status(200).json({
    source: result.source,
    count: created.length,
    specUrl: result.specUrl,
    endpoints: created,
  });
}

export const discoverSpec = asyncHandler(discoverSpecHandler);
