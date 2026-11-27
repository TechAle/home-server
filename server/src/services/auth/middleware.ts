/**
 * Express guard: every route loaded after this middleware needs a valid
 * session token, except the two public auth routes.
 *
 * The client sends it as `Authorization: Bearer <token>`.
 */
import type { NextFunction, Request, Response } from "express";
import { verifyDownload } from "../anime/download-token.js";
import { authenticate } from "./index.js";

const PUBLIC_PATHS = new Set(["/auth/login", "/auth/register"]);

/** Express routes ignore case and a trailing slash; the guard must too. */
function publicPath(path: string): string {
  const normalized = path.replace(/\/+$/, "").toLowerCase();
  return normalized || "/";
}

export function bearerToken(req: Request): string {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return "";
  return header.slice("Bearer ".length).trim();
}

export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (PUBLIC_PATHS.has(publicPath(req.path))) {
      next();
      return;
    }

    // <video> range requests cannot carry the Bearer header, so the media route
    // accepts a short-lived HMAC-signed URL instead.
    if (
      (req.method === "GET" || req.method === "HEAD") &&
      req.path.startsWith("/downloads/")
    ) {
      const file = req.path.slice("/downloads/".length);
      if (verifyDownload(file, req.query.expires, req.query.sig)) {
        next();
        return;
      }
    }

    const token = bearerToken(req);
    if (!token) {
      res.status(401).json({ error: "Missing API key." });
      return;
    }

    const user = authenticate(token);
    if (!user) {
      res.status(401).json({ error: "Invalid or expired API key." });
      return;
    }

    res.locals.user = user;
    next();
  };
}
