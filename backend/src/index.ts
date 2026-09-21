import path from "path";
import express from "express";
import cors from "cors";
import multer from "multer";
import yaml from "js-yaml";
import { readFileSync } from "fs";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import projectRoutes from "./routes/project.routes";

const app = express();
const openapiPath = path.resolve(__dirname, "../../openapi.yaml");

app.use(
  cors({
    origin: env.frontendOrigins.length === 1 ? env.frontendOrigins[0] : env.frontendOrigins,
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/openapi.yaml", (_req, res) => {
  res.type("application/yaml").sendFile(openapiPath);
});

app.get("/openapi.json", (_req, res, next) => {
  try {
    const doc = yaml.load(readFileSync(openapiPath, "utf8"));
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

app.use("/auth", authRoutes);
app.use("/projects", projectRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(env.port, () => {
  console.log(`API listening on port ${env.port}`);
});
