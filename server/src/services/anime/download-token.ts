/**
 * Short-lived signatures for downloaded media.
 *
 * The WebView asks for <video> ranges directly, so the file route cannot rely
 * on the Bearer header (media requests do not carry it reliably). The job
 * status returns `/downloads/<file>?expires=…&sig=…`, signed with an HMAC.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SECRET =
  (process.env.DOWNLOAD_SECRET ?? "").trim() || randomBytes(32).toString("hex");
const TTL_MS = 6 * 60 * 60 * 1000;

export interface SignedDownload {
  expires: number;
  sig: string;
}

export function signDownload(file: string): SignedDownload {
  const expires = Date.now() + TTL_MS;
  const sig = createHmac("sha256", SECRET).update(`${file}:${expires}`).digest("base64url");
  return { expires, sig };
}

export function verifyDownload(file: string, expires: unknown, sig: unknown): boolean {
  const expiry = Number(expires);
  const signature = typeof sig === "string" ? sig : "";
  if (!Number.isFinite(expiry) || expiry < Date.now() || !signature) return false;

  const expected = createHmac("sha256", SECRET)
    .update(`${file}:${expiry}`)
    .digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
