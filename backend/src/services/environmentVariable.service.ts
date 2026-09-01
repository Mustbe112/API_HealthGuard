/**
 * All reads/writes of project secrets (API tokens, auth headers, etc.)
 * go through this service so encryption is applied consistently and
 * callers never handle raw crypto themselves.
 */

import { prisma } from "../db/client";
import { encryptSecret, decryptSecret } from "../utils/crypto";

export interface SetVariableInput {
  projectId: string;
  key: string;
  value: string;
  isSecret?: boolean; // default true — treat as secret unless told otherwise
}

export async function setVariable(input: SetVariableInput) {
  const { projectId, key, value } = input;
  const isSecret = input.isSecret ?? true;

  if (isSecret) {
    const { ciphertext, iv, authTag } = encryptSecret(value);
    return prisma.environmentVariable.upsert({
      where: { projectId_key: { projectId, key } },
      create: { projectId, key, value: ciphertext, iv, authTag, isSecret: true },
      update: { value: ciphertext, iv, authTag, isSecret: true },
    });
  }

  return prisma.environmentVariable.upsert({
    where: { projectId_key: { projectId, key } },
    create: { projectId, key, value, isSecret: false, iv: null, authTag: null },
    update: { value, isSecret: false, iv: null, authTag: null },
  });
}

/** Returns all variables for a project with secrets DECRYPTED — only use
 * this server-side inside the test runner, never expose the result
 * directly over an API response. */
export async function getResolvedVariables(
  projectId: string
): Promise<Record<string, string>> {
  const rows = await prisma.environmentVariable.findMany({ where: { projectId } });

  const resolved: Record<string, string> = {};
  for (const row of rows) {
    if (row.isSecret) {
      if (!row.iv || !row.authTag) {
        throw new Error(`Variable ${row.key} is marked secret but missing iv/authTag`);
      }
      resolved[row.key] = decryptSecret({
        ciphertext: row.value,
        iv: row.iv,
        authTag: row.authTag,
      });
    } else {
      resolved[row.key] = row.value;
    }
  }
  return resolved;
}

/** Safe to expose over an API — never returns secret values, just which
 * keys exist and whether each one is a secret. */
export async function listVariablesMasked(projectId: string) {
  const rows = await prisma.environmentVariable.findMany({
    where: { projectId },
    select: { id: true, key: true, isSecret: true, updatedAt: true },
  });
  return rows.map((r) => ({
    ...r,
    value: r.isSecret ? "••••••••" : undefined,
  }));
}
