/**
 * createApp — build the Express application, register the static HTML routes
 * and boot every service found in `services/executables`.
 */
import express, { type Express } from "express";
import { join } from "node:path";
import { loadExecutables, type LoadedService } from "./loader.js";
import { createRegistry, type Logger, type Registry } from "./registry.js";
import type { AppConfig } from "./config.js";

const here = import.meta.dirname;
const executablesDir = join(here, "services", "executables");

export interface CreatedApp {
  app: Express;
  registry: Registry;
  loaded: LoadedService[];
}

export interface CreateAppOptions {
  log?: Logger;
}

interface Configurable {
  configure(anilist: AppConfig["anilist"], log: Logger): unknown;
}

function isConfigurable(value: object): value is Configurable {
  return "configure" in value && typeof value.configure === "function";
}

export async function createApp(config: AppConfig, { log = console }: CreateAppOptions = {}): Promise<CreatedApp> {
  const app = express();
  const registry = createRegistry({ app, log });

  app.get("/", (_req, res) => res.sendFile(join(config.templates, "index.html")));
  app.get("/unsubscribe", (_req, res) => res.sendFile(join(config.templates, "unsubscribe.html")));
  app.get("/admin", (_req, res) => res.sendFile(join(config.templates, "admin.html")));
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
