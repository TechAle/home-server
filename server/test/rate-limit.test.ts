import { test, after } from "node:test";
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
const dataDir = await mkdtemp(join(tmpdir(), "home-server-rate-"));

const config: AppConfig = {
  anilist: {
    api: "https://graphql.anilist.co",
    clientId: "",
    clientSecret: "",
    redirectUri: "",
    accessToken: "",
  },
  auth: {
    databasePath: join(dataDir, "rate.db"),
    registrationKey: "test-registration-key",
    sessionTtlDays: 30,
  },
  templates: join(serverRoot, "templates"),
};

const { app, registry } = await createApp(config, { log: silent, authRateLimitMax: 2 });
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

after(async () => {
  registry.stop();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  closeAuth();
  await rm(dataDir, { recursive: true, force: true });
});

function loginAttempt(): Promise<Response> {
  return fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "nobody", password: "wrong-password" }),
  });
}

test("repeated login attempts from the same IP are throttled", async () => {
  assert.equal((await loginAttempt()).status, 401);
  assert.equal((await loginAttempt()).status, 401);

  const blocked = await loginAttempt();
  assert.equal(blocked.status, 429);
  const body = (await blocked.json()) as { error: string };
  assert.match(body.error, /Too many/);
});

test("protected routes are not affected by the auth limiter", async () => {
  const response = await fetch(`${base}/info`);
  assert.equal(response.status, 401);
});
