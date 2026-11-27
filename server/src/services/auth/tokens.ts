/**
 * Session tokens (the "API key" the client stores) and constant-time secret
 * comparison.
 *
 * The database only ever holds the SHA-256 of a token: a leaked database does
 * not leak usable keys.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_BYTES = 32;

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Compare two secrets without leaking their length or content through timing. */
export function compareSecrets(left: string, right: string): boolean {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}
