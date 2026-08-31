import { prisma } from "../db/client";
import { NormalizedEndpoint } from "./parsers/types";

export async function replaceProjectEndpoints(
  projectId: string,
  endpoints: NormalizedEndpoint[],
  options?: { serverUrl?: string }
) {
  return prisma.$transaction(async (tx) => {
    await tx.endpoint.deleteMany({ where: { projectId } });
    await tx.endpoint.createMany({
      data: endpoints.map((e) => ({
        projectId,
        name: e.name,
        method: e.method,
        path: e.path,
        expectedStatus: e.expectedStatus,
        documentedStatuses: e.documentedStatuses,
        requiresAuth: e.requiresAuth,
        requestSchema: e.requestSchema as any,
        responseSchema: e.responseSchema as any,
        headers: e.headers as any,
      })),
    });
    if (options?.serverUrl) {
      await tx.project.update({ where: { id: projectId }, data: { baseUrl: options.serverUrl } });
    }
    return tx.endpoint.findMany({
      where: { projectId },
      orderBy: [{ path: "asc" }, { method: "asc" }],
    });
  });
}
