/**
 * createApp — build the Express application, register the static HTML routes
 * and boot every service found in `services/executables`, mirroring
 * `MyFlaskApp.configure_routes()` + `init_executables()`.
 */
import express from "express";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadExecutables } from "./loader.js";
import { createRegistry } from "./registry.js";

const here = dirname(fileURLToPath(import.meta.url));
const executablesDir = join(here, "services", "executables");

/**
 * @param {{ anilist: object, templates: string }} config
 * @param {{ log?: Console }} [options]
 */
export async function createApp(config, { log = console } = {}) {
  const app = express();
  const registry = createRegistry({ app, log });

  // Same stub pages as the Flask app (templates/index.html and friends).
  app.get("/", (_req, res) => res.sendFile(join(config.templates, "index.html")));
  app.get("/unsubscribe", (_req, res) => res.sendFile(join(config.templates, "unsubscribe.html")));
  app.get("/admin", (_req, res) => res.sendFile(join(config.templates, "admin.html")));
  app.get("/info", (_req, res) => res.type("text/plain").send("Hello!."));

  const loaded = await loadExecutables(executablesDir, registry, {
    log,
    setup(instance) {
      // Services that need configuration expose a `configure` method
      // (AnilistManager); the others ignore it.
      if (typeof instance.configure === "function") instance.configure(config.anilist);
    },
  });

  log.info?.(
    `[app] ${loaded.length} service(s) loaded, ${registry.snapshot().routes.length} route(s) registered`,
  );

  return { app, registry, loaded };
}
