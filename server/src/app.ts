/**
 * createApp — build the Express application, register the static HTML routes
 * and boot every service found in `services/executables`.
 */
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import { join } from "node:path";
import { loadExecutables, type LoadedService } from "./loader.js";
import { createRegistry, type Logger, type Registry } from "./registry.js";
import type { AppConfig } from "./config.js";
import { configureAuth } from "./services/auth/index.js";
import { requireAuth } from "./services/auth/middleware.js";

const here = import.meta.dirname;
const executablesDir = join(here, "services", "executables");

const AUTH_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_AUTH_RATE_LIMIT = 10;

export interface CreatedApp {
  app: Express;
  registry: Registry;
  loaded: LoadedService[];
}

export interface CreateAppOptions {
  log?: Logger;
  /** Requests per 15 minutes per IP on /auth/login and /auth/register. */
  authRateLimitMax?: number;
}

interface Configurable {
  configure(anilist: AppConfig["anilist"], log: Logger): unknown;
}

function isConfigurable(value: object): value is Configurable {
  return "configure" in value && typeof value.configure === "function";
}

/**
 * `TRUST_PROXY=1` (one reverse proxy, e.g. Caddy on localhost) makes `req.ip`
 * the client address from `X-Forwarded-For`. Only numeric hop counts are
 * accepted: `true` would trust the whole header and let clients spoof their IP.
 */
function trustProxySetting(): number | boolean {
  const raw = process.env.TRUST_PROXY?.trim();
  if (!raw) return false;
  const hops = Number(raw);
  return Number.isInteger(hops) && hops >= 0 ? hops : false;
}

function authRateLimit(): number {
  const fromEnv = Number(process.env.AUTH_RATE_LIMIT_MAX);
  if (Number.isInteger(fromEnv) && fromEnv > 0) return fromEnv;
  return DEFAULT_AUTH_RATE_LIMIT;
}

export async function createApp(
  config: AppConfig,
  { log = console, authRateLimitMax }: CreateAppOptions = {},
): Promise<CreatedApp> {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", trustProxySetting());
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    // Responses include session tokens and personal data: never cache them.
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "16kb" }));

  // Throttle the only public write endpoints: without this a public server can
  // be brute-forced for passwords or registration keys.
  app.use(
    ["/auth/login", "/auth/register"],
    rateLimit({
      windowMs: AUTH_WINDOW_MS,
      limit: authRateLimitMax ?? authRateLimit(),
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { error: "Too many authentication attempts. Try again later." },
    }),
  );

  const registry = createRegistry({ app, log });

  app.get("/", (_req, res) => res.sendFile(join(config.templates, "index.html")));
  app.get("/unsubscribe", (_req, res) => res.sendFile(join(config.templates, "unsubscribe.html")));
  app.get("/admin", (_req, res) => res.sendFile(join(config.templates, "admin.html")));

  // Everything registered from here on needs a valid session token; only the
  // two public auth routes are exempt (see services/auth/middleware.ts).
  configureAuth(config.auth);
  app.use(requireAuth());

  app.get("/info", (_req, res) => res.type("text/plain").send("Hello!."));

  const loaded = await loadExecutables(executablesDir, registry, {
    log,
    setup(instance) {
      // Services that need configuration expose `configure` (AnilistManager).
      if (isConfigurable(instance)) instance.configure(config.anilist, log);
    },
  });

  log.info?.(
    `[app] ${loaded.length} service(s) loaded, ${registry.snapshot().routes.length} route(s) registered`,
  );

  return { app, registry, loaded };
}
