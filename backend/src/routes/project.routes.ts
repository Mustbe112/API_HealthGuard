import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { createProject, listProjects, getProject, updateProject, updateEndpoint } from "../controllers/project.controller";
import { uploadMiddleware, uploadSpec } from "../controllers/upload.controller";
import { discoverSpec } from "../controllers/discover.controller";
import { triggerRun, getRun, listRuns } from "../controllers/testRun.controller";
import { tryEndpoint } from "../controllers/try.controller";
import {
  setProjectVariable,
  listProjectVariables,
  deleteProjectVariable,
} from "../controllers/environmentVariable.controller";

const router = Router();

router.use(requireAuth); // every project route requires a logged-in user

router.post("/", createProject);
router.get("/", listProjects);
router.get("/:projectId", getProject);
router.patch("/:projectId", updateProject);
router.post("/:projectId/upload", uploadMiddleware, uploadSpec);
router.post("/:projectId/discover", discoverSpec);
router.patch("/:projectId/endpoints/:endpointId", updateEndpoint);
router.post("/:projectId/endpoints/:endpointId/try", tryEndpoint);

router.post("/:projectId/run", triggerRun);
router.get("/:projectId/runs", listRuns);
router.get("/:projectId/runs/:runId", getRun);

router.get("/:projectId/variables", listProjectVariables);
router.post("/:projectId/variables", setProjectVariable);
router.delete("/:projectId/variables/:key", deleteProjectVariable);

export default router;
