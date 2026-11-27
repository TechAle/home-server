import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createApp } from "../src/app.js";
import { serverRoot, type AppConfig } from "../src/config.js";
import { closeAuth } from "../src/services/auth/index.js";
import type { Logger } from "../src/registry.js";

const silent: Logger = { info() {}, warn() {}, error() {} };
const dataDir = await mkdtemp(join(tmpdir(), "home-server-foundry-"));
const registrationKey = "foundry-test-key";
const helperCalls: string[] = [];

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

// Stand-in for server/host/foundry-control.mjs.
const helper = createServer((req, res) => {
  if (req.headers.authorization !== "Bearer helper-secret") {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized." }));
    return;
  }

  helperCalls.push(`${req.method} ${req.url}`);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify(req.url === "/status" ? { online: true, service: "active" } : { ok: true }),
  );
});
await new Promise<void>((resolve) => helper.listen(0, "127.0.0.1", resolve));
const helperPort = (helper.address() as AddressInfo).port;

process.env.FOUNDRY_CONTROL_TOKEN = "helper-secret";
process.env.FOUNDRY_CONTROL_URL = `http://127.0.0.1:${helperPort}`;

const config: AppConfig = {
  anilist: {
    api: "https://graphql.anilist.co",
    clientId: "",
    clientSecret: "",
    redirectUri: "",
    accessToken: "",
  },
  auth: {
    databasePath: join(dataDir, "foundry.db"),
    registrationKey,
    sessionTtlDays: 30,
  },
  templates: join(serverRoot, "templates"),
};

const { app, registry } = await createApp(config, {
  log: silent,
  authRateLimitMax: 1000,
});
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

const registration = await fetch(`${base}/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "foundry-tester", password: "password123", registrationKey }),
});
assert.equal(registration.status, 201);
const token = ((await registration.json()) as { token: string }).token;

after(async () => {
  registry.stop();
  await closeServer(server);
  closeAuth();
  await rm(dataDir, { recursive: true, force: true });
  await closeServer(helper);
});

test("GET /foundry/status uses the helper and keeps auth", async () => {
  const anonymous = await fetch(`${base}/foundry/status`);
  assert.equal(anonymous.status, 401);

  const response = await fetch(`${base}/foundry/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { online: true, service: "active" });
  assert.ok(helperCalls.includes("GET /status"));
});

test("POST /foundry/start restarts Foundry through the helper", async () => {
  const response = await fetch(`${base}/foundry/start`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.ok(helperCalls.includes("POST /restart"));
});

test("the helper token is required and never exposed by the API", async () => {
  const response = await fetch(`${base}/foundry/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  assert.ok(!text.includes("helper-secret"));
});
