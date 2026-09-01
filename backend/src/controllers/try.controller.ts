import { Request, Response, RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { buildManualRequest } from "../services/runner/manual";
import { executeManual } from "../services/runner/executor";

function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

const trySchema = z.object({
  pathParams: z.record(z.string()).optional().default({}),
  query: z.record(z.string()).optional().default({}),
  headers: z.record(z.string()).optional().default({}),
  body: z.string().optional(),
  bearerToken: z.string().optional(),
});

async function tryEndpointHandler(req: Request, res: Response) {
  const { projectId, endpointId } = req.params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: req.user!.userId },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const endpoint = await prisma.endpoint.findFirst({
    where: { id: endpointId, projectId },
  });
  if (!endpoint) return res.status(404).json({ error: "Endpoint not found" });

  const parsed = trySchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  let built;
  try {
    built = buildManualRequest({
      baseUrl: project.baseUrl,
      method: endpoint.method,
      pathTemplate: endpoint.path,
      pathParams: parsed.data.pathParams,
      query: parsed.data.query,
      headers: parsed.data.headers,
      body: parsed.data.body,
      bearerToken: parsed.data.bearerToken,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message ?? "Invalid request" });
  }

  const result = await executeManual(built);

  return res.status(200).json({
    result: {
      statusCode: result.statusCode,
      responseTimeMs: result.responseTimeMs,
      responseBody: result.responseBody,
      responseHeaders: result.responseHeaders ?? {},
      errorMessage: result.errorMessage,
      request: result.request,
    },
  });
}

export const tryEndpoint = asyncHandler(tryEndpointHandler);
