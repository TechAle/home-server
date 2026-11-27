/**
 * Password hashing with scrypt (node:crypto, no native dependencies).
 *
 * The stored value carries its own parameters and salt, so the cost can be
 * raised later without invalidating existing hashes:
 *
 *   scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>
 */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

const PREFIX = "scrypt";
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const PARAMS = { N: 16384, r: 8, p: 1 } as const;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await scryptAsync(password, salt, KEY_BYTES, PARAMS);
  return [PREFIX, PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== PREFIX) return false;

  const [, n, r, p, saltB64, hashB64] = parts;
  const N = Number(n);
  const rValue = Number(r);
  const pValue = Number(p);
  if (!Number.isInteger(N) || !Number.isInteger(rValue) || !Number.isInteger(pValue)) return false;

  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  if (salt.length === 0 || expected.length === 0) return false;

  const actual = await scryptAsync(password, salt, expected.length, { N, r: rValue, p: pValue });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
