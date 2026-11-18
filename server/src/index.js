/**
 * Entry point — the Node equivalent of `flaskMain.py`'s `__main__` block.
 * Listens on the same port (5000) unless PORT is set.
 */
import { createApp } from "./app.js";
import { loadConfiguration } from "./config.js";

const config = await loadConfiguration();
const { app, registry } = await createApp(config);

const port = Number(process.env.PORT ?? 5000);
const server = app.listen(port, () => {
  console.info(`[app] listening on http://0.0.0.0:${port}`);
  console.info(`[app] routes: ${registry.snapshot().routes.map((r) => `${r.method} ${r.url}`).join(", ")}`);
});

function shutdown(signal) {
  console.info(`[app] ${signal} received, shutting down`);
  registry.stop();
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
