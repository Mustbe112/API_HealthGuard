import { prisma } from "../../db/client";
import { getResolvedVariables } from "../environmentVariable.service";
import { buildRegisterRequest, buildZeroInputRequest } from "./requestBuilder";
import { executeRequest, skippedResult, ExecutionResult } from "./executor";
import {
  ProbeRecord,
  asStatusList,
  bodyFromSchema,
  cautionForResult,
  extractToken,
  generateThrowawayCredentials,
  isRegisterEndpoint,
  planProbes,
} from "./zeroInput";
import { classifyOutcome, pickWorseResult } from "./outcome";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

interface EndpointRow {
  id: string;
  name: string;
  method: string;
  path: string;
  expectedStatus: number;
  documentedStatuses: unknown;
  requiresAuth: boolean;
  headers: unknown;
  requestSchema: unknown;
  responseSchema: unknown;
}

function envAuthToken(vars: Record<string, string>): string | null {
  return vars.API_TOKEN ?? vars.TOKEN ?? vars.ACCESS_TOKEN ?? vars.JWT ?? null;
}

function withSnapshot(
  result: ExecutionResult,
  probe: ProbeRecord,
  path: string
): ProbeRecord {
  return {
    ...probe,
    caution: cautionForResult(result.statusCode, path, result.passed),
    request: result.request,
  };
}

async function saveResult(
  testRunId: string,
  endpointId: string,
  result: ExecutionResult,
  probe: ProbeRecord | null
) {
  await prisma.testResult.create({
    data: {
      testRunId,
      endpointId,
      statusCode: result.statusCode,
      responseTimeMs: result.responseTimeMs,
      passed: result.passed,
      errorMessage: result.errorMessage,
      responseBody: result.responseBody as any,
      probe: probe as any,
    },
  });
}

/** Creates a RUNNING row and executes in the background so the UI can poll. */
export async function startProjectTests(projectId: string, dryRun: boolean): Promise<string> {
  const testRun = await prisma.testRun.create({
    data: { projectId, status: "RUNNING", dryRun, startedAt: new Date() },
  });

  void executeProjectTests(testRun.id, projectId, dryRun).catch(async (err) => {
    console.error("Test run failed", err);
    await prisma.testRun.update({
      where: { id: testRun.id },
      data: { status: "FAILED", finishedAt: new Date() },
    });
  });

  return testRun.id;
}

async function executeProjectTests(testRunId: string, projectId: string, dryRun: boolean) {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const endpoints = (await prisma.endpoint.findMany({
    where: { projectId },
  })) as EndpointRow[];

  try {
    const resolvedVars = await getResolvedVariables(projectId);
    const tested = new Set<string>();
    let authToken = envAuthToken(resolvedVars);

    const register = endpoints.find(isRegisterEndpoint);
    if (register && !dryRun) {
      const creds = generateThrowawayCredentials();
      const body = bodyFromSchema(register.requestSchema, creds);
      const documented = asStatusList(register.documentedStatuses, register.expectedStatus);
      const built = buildRegisterRequest(register, project.baseUrl, body);
      const execResult = await executeRequest(built, documented, "register", register.path);
      const extracted = extractToken(execResult.responseBody);
      if (extracted) authToken = extracted;

      await saveResult(
        testRunId,
        register.id,
        execResult,
        withSnapshot(
          execResult,
          {
            sent: "Auto-created throwaway account",
            expected: documented,
            proves: extracted
              ? "Throwaway account created — later probes can send a real token"
              : execResult.passed
                ? "Register route responds the way the spec says it should"
                : "Could not create a throwaway account",
          },
          register.path
        )
      );
      tested.add(register.id);
    }

    for (const endpoint of endpoints) {
      if (tested.has(endpoint.id)) continue;

      const isWrite = WRITE_METHODS.has(endpoint.method);
      if (dryRun && isWrite) {
        await saveResult(testRunId, endpoint.id, skippedResult(), {
          sent: "Nothing (dry run)",
          expected: asStatusList(endpoint.documentedStatuses, endpoint.expectedStatus),
          proves: "Write skipped — enable a full run to probe this route",
        });
        continue;
      }

      const probes = planProbes(endpoint, Boolean(authToken));
      if (probes.length === 0) {
        await saveResult(testRunId, endpoint.id, skippedResult(), {
          sent: "Nothing",
          expected: asStatusList(endpoint.documentedStatuses, endpoint.expectedStatus),
          proves: "No zero-input probe for this route",
        });
        continue;
      }

      const attempts: { exec: ExecutionResult; probe: ProbeRecord }[] = [];
      for (const probe of probes) {
        const built = buildZeroInputRequest(
          endpoint,
          project.baseUrl,
          probe,
          resolvedVars,
          authToken
        );
        const documented = asStatusList(endpoint.documentedStatuses, endpoint.expectedStatus);
        const execResult = await executeRequest(built, documented, probe.kind, endpoint.path);
        attempts.push({
          exec: execResult,
          probe: withSnapshot(
            execResult,
            {
              sent: probe.sent,
              expected: probe.expected,
              proves: probe.proves,
            },
            endpoint.path
          ),
        });
      }

      const worstExec = pickWorseResult(attempts.map((a) => a.exec));
      const winner = attempts.find((a) => a.exec === worstExec) ?? attempts[attempts.length - 1];
      if (attempts.length > 1) {
        const label = classifyOutcome(winner.exec);
        winner.probe.proves = `${winner.probe.proves} · ${attempts.length} probes, kept ${label}`;
      }
      await saveResult(testRunId, endpoint.id, winner.exec, winner.probe);
    }

    await prisma.testRun.update({
      where: { id: testRunId },
      data: { status: "COMPLETED", finishedAt: new Date() },
    });
  } catch (err) {
    await prisma.testRun.update({
      where: { id: testRunId },
      data: { status: "FAILED", finishedAt: new Date() },
    });
    throw err;
  }
}
