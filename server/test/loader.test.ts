import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadExecutables } from "../src/loader.js";
import type { Registry } from "../src/registry.js";

function fakeRegistry() {
  const calls = { routes: [] as string[], tasks: [] as Array<{ interval: number; name: string }>, functions: [] as string[] };
  const registry = {
    route(method: string, url: string) {
      calls.routes.push(`${method} ${url}`);
    },
    scheduledTask(interval: number, _handler: unknown, name: string) {
      calls.tasks.push({ interval, name });
    },
    serverFunction(name: string) {
      calls.functions.push(name);
    },
  } as unknown as Registry;

  return { calls, registry };
}

test("loads a service and registers its rules", async () => {
  const dir = await mkdtemp(join(tmpdir(), "loader-"));
  try {
    await writeFile(
      join(dir, "demo-service.ts"),
      `
      import { route, scheduledTask, serverFunction } from ${JSON.stringify(
        new URL("../src/rules.ts", import.meta.url).href,
      )};

      export default class DemoService {
        ping = route("/ping", ["GET"])(async () => ({ ok: true }));
        write = route("/write", ["POST"])(async () => ({ saved: true }));
        tick = scheduledTask(60000)(async () => {});
        helper = serverFunction()(async () => "x");
      }
      `,
    );

    const { calls, registry } = fakeRegistry();
    const loaded = await loadExecutables(dir, registry, { log: { warn() {} } });

    assert.equal(loaded.length, 1);
    assert.deepEqual(calls.routes, ["GET /ping", "POST /write"]);
    assert.equal(calls.tasks.length, 1);
    assert.equal(calls.tasks[0]?.interval, 60000);
    assert.deepEqual(calls.functions, ["helper"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("ignores files without a default class", async () => {
  const dir = await mkdtemp(join(tmpdir(), "loader-"));
  try {
    await writeFile(join(dir, "not-a-service.ts"), `export const value = 42;`);
    const { calls, registry } = fakeRegistry();
    const loaded = await loadExecutables(dir, registry, { log: { warn() {} } });
    assert.equal(loaded.length, 0);
    assert.deepEqual(calls.routes, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("rejects malformed route definitions early", async () => {
  const { route } = await import("../src/rules.js");
  assert.throws(() => route("no-slash"), TypeError);
});
