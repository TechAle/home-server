import { test, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { createApp } from "../src/app.js";
import { serverRoot, type AppConfig } from "../src/config.js";
import type { Logger } from "../src/registry.js";

const silent: Logger = { info() {}, warn() {}, error() {} };

async function startServer() {
  const config: AppConfig = {
    anilist: {
      api: "https://graphql.anilist.co",
      clientId: "",
      clientSecret: "",
      redirectUri: "",
      accessToken: "",
    },
    templates: join(serverRoot, "templates"),
  };

  const { app, registry } = await createApp(config, { log: silent });
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;

  return { base: `http://127.0.0.1:${port}`, server, registry };
}

const running = await startServer();

after(() => {
  running.registry.stop();
  running.server.close();
});

test("GET /info answers like the Flask route", async () => {
  const response = await fetch(`${running.base}/info`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "Hello!.");
});

test("GET /get_computer_info returns system data", async () => {
  const response = await fetch(`${running.base}/get_computer_info`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as { hostname: string; system: string };
  assert.equal(typeof body.hostname, "string");
  assert.equal(typeof body.system, "string");
  assert.ok(body.system.length > 0);
});

test("GET /get_memory_usage returns the four expected keys", async () => {
  const response = await fetch(`${running.base}/get_memory_usage`);
  const body = (await response.json()) as Record<string, number>;
  assert.deepEqual(Object.keys(body).sort(), ["free_memory", "memory_percent", "total_memory", "used_memory"]);
});

test("GET /get_system_resource_info returns cpu, ram and disk", async () => {
  const response = await fetch(`${running.base}/get_system_resource_info`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    ram: Record<string, number>;
    disk: Record<string, number>;
  };
  assert.deepEqual(Object.keys(body).sort(), ["cpu_temperature", "cpu_usage_percent", "disk", "ram"]);
  assert.deepEqual(Object.keys(body.ram).sort(), ["free_mib", "percent_used", "total_mib", "used_mib"]);
  assert.deepEqual(Object.keys(body.disk).sort(), ["free_gib", "percent_used", "total_gib", "used_gib"]);
});

test("GET /get_anime answers 503 without an AniList token", async () => {
  const response = await fetch(`${running.base}/get_anime`);
  assert.equal(response.status, 503);
  const body = (await response.json()) as { error: string };
  assert.match(body.error, /ANILIST_ACCESS_TOKEN/);
});
