import { test } from "node:test";
import assert from "node:assert/strict";
import { createFoundryControl } from "../src/services/foundry/control.js";

const baseUrl = "http://helper.test";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("status forwards the helper answer and bearer token", async () => {
  let captured = "";
  const control = createFoundryControl({
    baseUrl,
    token: "secret",
    fetchImpl: (async (url: RequestInfo | URL, init?: RequestInit) => {
      captured = `${init?.method} ${String(url)} ${String(
        (init?.headers as Record<string, string>).Authorization,
      )}`;
      return jsonResponse({ online: true, service: "active" });
    }) as unknown as typeof fetch,
  });

  assert.deepEqual(await control.status(), { online: true, service: "active" });
  assert.equal(captured, `GET ${baseUrl}/status Bearer secret`);
});

test("status reports offline and the error when the helper is unreachable", async () => {
  const control = createFoundryControl({
    baseUrl,
    token: "secret",
    fetchImpl: (async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:5050");
    }) as unknown as typeof fetch,
  });

  const status = await control.status();
  assert.equal(status.online, false);
  assert.equal(status.service, "unknown");
  assert.match(status.error ?? "", /ECONNREFUSED/);
});

test("status reports an unconfigured helper without calling it", async () => {
  let called = false;
  const control = createFoundryControl({
    baseUrl,
    token: "",
    fetchImpl: (async () => {
      called = true;
      return jsonResponse({});
    }) as unknown as typeof fetch,
  });

  const status = await control.status();
  assert.equal(called, false);
  assert.equal(status.online, false);
  assert.match(status.error ?? "", /FOUNDRY_CONTROL_TOKEN/);
});

test("start posts to the helper without restarting", async () => {
  let captured = "";
  const control = createFoundryControl({
    baseUrl,
    token: "secret",
    fetchImpl: (async (url: RequestInfo | URL, init?: RequestInit) => {
      captured = `${init?.method} ${String(url)}`;
      return jsonResponse({ ok: true });
    }) as unknown as typeof fetch,
  });

  await control.start();
  assert.equal(captured, `POST ${baseUrl}/start`);
});

test("restart posts to the helper and propagates failures", async () => {
  let captured = "";
  const control = createFoundryControl({
    baseUrl,
    token: "secret",
    fetchImpl: (async (url: RequestInfo | URL, init?: RequestInit) => {
      captured = `${init?.method} ${String(url)}`;
      return jsonResponse({ error: "boom" }, 502);
    }) as unknown as typeof fetch,
  });

  await assert.rejects(control.restart(), (error: { status?: number }) => error.status === 502);
  assert.equal(captured, `POST ${baseUrl}/restart`);
});
