#!/usr/bin/env node
/**
 * Localhost-only helper for the home-server container.
 *
 * The container cannot manage host processes, so this tiny service checks
 * Foundry's TCP port and restarts `foundry-script.service` (the systemd unit
 * that owns the Foundry process). It is protected by a bearer token shared
 * through server/.env and must never listen beyond 127.0.0.1.
 */
import { execFile } from "node:child_process";
import { createHash, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { connect } from "node:net";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const HOST = "127.0.0.1";
const PORT = Number(process.env.FOUNDRY_CONTROL_PORT ?? 5050);
const TOKEN = (process.env.FOUNDRY_CONTROL_TOKEN ?? "").trim();
const FOUNDRY_PORT = Number(process.env.FOUNDRY_PORT ?? 30000);
const SERVICE = process.env.FOUNDRY_SERVICE ?? "foundry-script.service";

if (!TOKEN) {
  console.error("[foundry-control] FOUNDRY_CONTROL_TOKEN is missing");
  process.exit(1);
}

function tokenMatches(header) {
  const provided = String(header ?? "").replace(/^Bearer\s+/i, "").trim();
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(TOKEN).digest();
  return timingSafeEqual(a, b);
}

/** Foundry answers on its port as soon as the HTTP server is up. */
function foundryOnline(timeoutMs = 800) {
  return new Promise(resolve => {
    const socket = connect({ host: "127.0.0.1", port: FOUNDRY_PORT });
    let done = false;

    const finish = online => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(online);
    };

    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

async function serviceState() {
  try {
    const { stdout } = await execFileAsync("/bin/systemctl", ["is-active", SERVICE]);
    return stdout.trim() || "unknown";
  } catch (error) {
    // is-active exits non-zero for inactive/failed units, but still prints it.
    return String(error?.stdout ?? "").trim() || "unknown";
  }
}

async function restartService() {
  await execFileAsync("/usr/bin/sudo", ["-n", "/bin/systemctl", "restart", SERVICE], {
    timeout: 20_000,
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  if (!tokenMatches(req.headers.authorization)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return;
  }

  const { pathname } = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);

  try {
    if (req.method === "GET" && pathname === "/status") {
      const [online, service] = await Promise.all([foundryOnline(), serviceState()]);
      sendJson(res, 200, { online, service });
      return;
    }

    if (req.method === "POST" && (pathname === "/start" || pathname === "/restart")) {
      await restartService();
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { error: "Not found." });
  } catch (error) {
    sendJson(res, 502, { error: error?.message ?? "Foundry control failed." });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[foundry-control] listening on http://${HOST}:${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
