import { Request, Response, RequestHandler } from "express";
import { z } from "zod";
import {
  ExplainConfigError,
  ExplainFailedError,
  explainHealthCheck,
} from "../services/explain/explain.service";

function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

const explainSchema = z.object({
  runId: z.string().uuid().optional(),
  endpointId: z.string().uuid().optional(),
});

async function explainHandler(req: Request, res: Response) {
  const parsed = explainSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const explanation = await explainHealthCheck({
      projectId: req.params.projectId,
      ownerId: req.user!.userId,
      runId: parsed.data.runId,
      endpointId: parsed.data.endpointId,
    });
    return res.status(200).json({ explanation });
  } catch (err) {
    if (err instanceof ExplainConfigError) {
      return res.status(503).json({ error: err.message });
    }
    if (err instanceof ExplainFailedError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
}

export const explainRun = asyncHandler(explainHandler);
