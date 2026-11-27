/**
 * AuthManager — the service the loader discovers: login, registration, logout
 * and the `me` probe the client uses to validate a cached key at startup.
 *
 * `POST /auth/login` and `POST /auth/register` are public; every other route in
 * the app is guarded by `requireAuth()` (see app.ts).
 */
import type { Request } from "express";
import { route } from "../../rules.js";
import { login, logout, register } from "../auth/index.js";
import { bearerToken } from "../auth/middleware.js";

function readBody(req: Request): Record<string, unknown> {
  const body: unknown = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  return body as Record<string, unknown>;
}

export default class AuthManager {
  registerUser = route("/auth/register", ["POST"])(async (req, res) => {
    const session = await register(readBody(req));
    res.status(201).json(session);
  });

  loginUser = route("/auth/login", ["POST"])(async (req) => login(readBody(req)));

  logoutUser = route("/auth/logout", ["POST"])(async (req, res) => {
    logout(bearerToken(req));
    res.status(204).end();
  });

  me = route("/auth/me", ["GET"])(async (_req, res) => ({ user: res.locals.user ?? null }));
}
