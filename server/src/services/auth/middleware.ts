/**
 * Express guard: every route loaded after this middleware needs a valid
 * session token, except the two public auth routes.
 *
 * The client sends it as `Authorization: Bearer <token>`.
 */
import type { NextFunction, Request, Response } from "express";
import { authenticate } from "./index.js";

const PUBLIC_PATHS = new Set(["/auth/login", "/auth/register"]);

export function bearerToken(req: Request): string {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return "";
  return header.slice("Bearer ".length).trim();
}

export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (PUBLIC_PATHS.has(req.path)) {
      next();
      return;
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
