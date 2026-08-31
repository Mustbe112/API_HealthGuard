/**
 * Password hashing for user accounts. ONE-WAY only — we never need the
 * original password back, only to verify a login attempt matches.
 *
 * Uses Argon2id (winner of the Password Hashing Competition, recommended
 * over bcrypt/scrypt by OWASP as of 2024+). Salt is generated and stored
 * automatically inside the returned hash string, so no separate salt
 * column is needed.
 */

import argon2 from "argon2";

const HASH_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MB, OWASP minimum recommendation
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, HASH_OPTIONS);
}

export async function verifyPassword(
  hash: string,
  plaintext: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    // Malformed hash, mismatched params, etc. — treat as failed auth,
    // never throw from an auth check.
    return false;
  }
}
