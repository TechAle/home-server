/**
 * Entry point. Listens on port 5000 unless PORT is set.
 */
import type { Server } from "node:http";
import { createApp } from "./app.js";
import { loadConfiguration } from "./config.js";

const config = await loadConfiguration();
const { app, registry } = await createApp(config);

const port = Number(process.env.PORT ?? 5000);

const server: Server = app.listen(port, () => {
  console.info(`[app] listening on http://0.0.0.0:${port}`);
  const { routes } = registry.snapshot();
  console.info(`[app] routes: ${routes.map((route) => `${route.method} ${route.url}`).join(", ")}`);
});

function shutdown(signal: string): void {
  console.info(`[app] ${signal} received, shutting down`);
  registry.stop();
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
