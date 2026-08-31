import { Request, Response, RequestHandler } from "express";
import multer from "multer";
import { prisma } from "../db/client";
import { parseSpecFile, UnsupportedSpecError } from "../services/parsers";
import { replaceProjectEndpoints } from "../services/endpoints.service";

function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB — plenty for a spec/collection file

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
}).single("file"); // form field must be named "file"

async function uploadSpecHandler(req: Request, res: Response) {
  const { projectId } = req.params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: req.user!.userId },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded (expected form field 'file')" });
  }

  let parsedResult;
  try {
    parsedResult = parseSpecFile(req.file.buffer, req.file.originalname);
  } catch (err) {
    if (err instanceof UnsupportedSpecError) {
      return res.status(422).json({ error: err.message });
    }
    return res.status(422).json({ error: "Could not parse the uploaded file. Is it valid JSON/YAML?" });
  }

  const { endpoints, format, serverUrl } = parsedResult;
  if (endpoints.length === 0) {
    return res.status(422).json({ error: "No endpoints found in the uploaded file" });
  }

  const created = await replaceProjectEndpoints(projectId, endpoints, { serverUrl });

  const projectAfter = await prisma.project.findUnique({ where: { id: projectId } });
  return res.status(200).json({
    format,
    count: created.length,
    endpoints: created,
    serverUrl: projectAfter?.baseUrl,
  });
}

export const uploadSpec = asyncHandler(uploadSpecHandler);
