/**
 * Encryption for data we must be able to read back in plaintext later
 * (API tokens, auth headers, etc. that the test runner sends on real
 * requests). This is NOT for passwords — see utils/hash.ts for those.
 *
 * Algorithm: AES-256-GCM
 *  - 256-bit key, kept OUTSIDE the database (env var / secrets manager).
 *  - Random 12-byte IV per encryption call — never reuse an IV with the
 *    same key.
 *  - GCM auth tag protects against ciphertext tampering (not just
 *    confidentiality, but integrity too).
 *
 * The master key (ENCRYPTION_KEY) should come from a proper secrets
 * manager (AWS KMS, GCP Secret Manager, Vault, etc.) in production, not
 * a plain .env file. .env is fine for local dev only.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended IV length for GCM

function getKey(): Buffer {
  const keyB64 = process.env.ENCRYPTION_KEY;
  if (!keyB64) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Generate one with: " +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256).");
  }
  return key;
}

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
  authTag: string; // base64
}

export function encryptSecret(plaintext: string): EncryptedPayload {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptSecret(payload: EncryptedPayload): string {
  const key = getKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(), // throws if authTag doesn't match (tampering/wrong key)
  ]);

  return plaintext.toString("utf8");
}
