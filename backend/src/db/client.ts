import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across hot reloads in dev to avoid
// exhausting DB connections.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (env_is_dev()) {
  global.__prisma = prisma;
}

function env_is_dev(): boolean {
  return process.env.NODE_ENV !== "production";
}
