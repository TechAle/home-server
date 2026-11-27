import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createApp } from "../src/app.js";
import { serverRoot, type AppConfig } from "../src/config.js";
import { closeAuth } from "../src/services/auth/index.js";
import type { Logger } from "../src/registry.js";

const silent: Logger = { info() {}, warn() {}, error() {} };
const dataDir = await mkdtemp(join(tmpdir(), "home-server-app-"));
const registrationKey = "test-registration-key";

async function startServer() {
  const config: AppConfig = {
    anilist: {
      api: "https://graphql.anilist.co",
      clientId: "",
      clientSecret: "",
      redirectUri: "",
      accessToken: "",
    },
    auth: {
      databasePath: join(dataDir, "app.db"),
      registrationKey,
      sessionTtlDays: 30,
    },
    templates: join(serverRoot, "templates"),
  };

  const { app, registry } = await createApp(config, { log: silent, authRateLimitMax: 1000 });
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;

  return { base: `http://127.0.0.1:${port}`, server, registry };
}

// The Foundry helper is a host-side service; tests run without it.
delete process.env.FOUNDRY_CONTROL_TOKEN;
delete process.env.FOUNDRY_CONTROL_URL;

const running = await startServer();

let token = "";

function authHeaders(value: string = token): Record<string, string> {
  return { Authorization: `Bearer ${value}` };
}

async function registerUser(username: string): Promise<string> {
  const response = await fetch(`${running.base}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: "password123", registrationKey }),
  });
  const body = (await response.json()) as { token?: string; error?: string };
  assert.equal(response.status, 201, body.error);
  assert.ok(body.token);
  return body.token;
}

before(async () => {
  token = await registerUser("tester");
});

after(async () => {
  running.registry.stop();
  await new Promise<void>((resolve) => running.server.close(() => resolve()));
  closeAuth();
  await rm(dataDir, { recursive: true, force: true });
});

test("GET /info requires the API key like every other route", async () => {
  const anonymous = await fetch(`${running.base}/info`);
  assert.equal(anonymous.status, 401);

  const response = await fetch(`${running.base}/info`, {headers: authHeaders()});
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "Hello!.");
});

test("protected routes reject requests without an API key", async () => {
  for (const path of ["/get_computer_info", "/get_memory_usage", "/get_anime"]) {
    const response = await fetch(`${running.base}${path}`);
    assert.equal(response.status, 401, path);
    const body = (await response.json()) as { error: string };
    assert.match(body.error, /API key/);
  }
});

test("POST /auth/register rejects a wrong registration key", async () => {
  const response = await fetch(`${running.base}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "intruder", password: "password123", registrationKey: "nope" }),
  });
  assert.equal(response.status, 403);
});

test("POST /auth/register creates a user and returns a token", async () => {
  const fresh = await registerUser("newcomer");
  assert.ok(fresh.length >= 32);
});

test("POST /auth/register rejects a duplicate username", async () => {
  const response = await fetch(`${running.base}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "tester", password: "password123", registrationKey }),
  });
  assert.equal(response.status, 409);
});

test("GET /auth/me resolves the cached key to its user", async () => {
  const response = await fetch(`${running.base}/auth/me`, { headers: authHeaders() });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { user: { username: string } };
  assert.equal(body.user.username, "tester");
});

test("GET /get_computer_info returns system data with a valid key", async () => {
  const response = await fetch(`${running.base}/get_computer_info`, { headers: authHeaders() });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { hostname: string; system: string };
  assert.equal(typeof body.hostname, "string");
  assert.equal(typeof body.system, "string");
  assert.ok(body.system.length > 0);
});

test("GET /get_memory_usage returns the four expected keys", async () => {
  const response = await fetch(`${running.base}/get_memory_usage`, { headers: authHeaders() });
  const body = (await response.json()) as Record<string, number>;
  assert.deepEqual(Object.keys(body).sort(), ["free_memory", "memory_percent", "total_memory", "used_memory"]);
});

test("GET /get_system_resource_info returns cpu, ram and disk", async () => {
  const response = await fetch(`${running.base}/get_system_resource_info`, { headers: authHeaders() });
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    ram: Record<string, number>;
    disk: Record<string, number>;
  };
  assert.deepEqual(Object.keys(body).sort(), ["cpu_temperature", "cpu_usage_percent", "disk", "ram"]);
  assert.deepEqual(Object.keys(body.ram).sort(), ["free_mib", "percent_used", "total_mib", "used_mib"]);
  assert.deepEqual(Object.keys(body.disk).sort(), ["free_gib", "percent_used", "total_gib", "used_gib"]);
  // Real values on Linux and macOS alike (only the temperature may be unavailable).
  assert.ok(body.ram.total_mib > 0);
  assert.ok(body.disk.total_gib > 0);
});

test("GET /foundry/status reports an unconfigured helper as offline", async () => {
  const response = await fetch(`${running.base}/foundry/status`, { headers: authHeaders() });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { online: boolean; error?: string };
  assert.equal(body.online, false);
  assert.match(body.error ?? "", /FOUNDRY_CONTROL_TOKEN/);
});

test("POST /foundry/start requires helper configuration", async () => {
  const response = await fetch(`${running.base}/foundry/start`, {
    method: "POST",
    headers: authHeaders(),
  });
  assert.equal(response.status, 503);
});

test("public auth routes accept a trailing slash", async () => {
  const response = await fetch(`${running.base}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "nobody", password: "wrong-password" }),
  });
  assert.equal(response.status, 401);
  const body = (await response.json()) as { error: string };
  assert.match(body.error, /Invalid username or password/);
});

test("POST /anime/watched validates its body", async () => {
  const response = await fetch(`${running.base}/anime/watched`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mediaId: "nope", progress: -1 }),
  });
  assert.equal(response.status, 400);

  const anonymous = await fetch(`${running.base}/anime/watched`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaId: 1, progress: 1 }),
  });
  assert.equal(anonymous.status, 401);
});

test("GET /get_anime answers 503 once authenticated but without an AniList token", async () => {
  const response = await fetch(`${running.base}/get_anime`, { headers: authHeaders() });
  assert.equal(response.status, 503);
  const body = (await response.json()) as { error: string };
  assert.match(body.error, /ANILIST_ACCESS_TOKEN/);
});

test("POST /auth/logout invalidates only that session", async () => {
  const otherToken = await registerUser("logout-tester");

  const logoutResponse = await fetch(`${running.base}/auth/logout`, {
    method: "POST",
    headers: authHeaders(otherToken),
  });
  assert.equal(logoutResponse.status, 204);

  const meResponse = await fetch(`${running.base}/auth/me`, { headers: authHeaders(otherToken) });
  assert.equal(meResponse.status, 401);

  // The original session is untouched.
  const stillValid = await fetch(`${running.base}/auth/me`, { headers: authHeaders() });
  assert.equal(stillValid.status, 200);
});
