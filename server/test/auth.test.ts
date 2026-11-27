import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  authenticate,
  closeAuth,
  configureAuth,
  login,
  logout,
  register,
} from "../src/services/auth/index.js";
import { hashPassword, verifyPassword } from "../src/services/auth/passwords.js";

const dir = await mkdtemp(join(tmpdir(), "home-server-auth-"));
const registrationKey = "test-registration-key";

configureAuth({
  databasePath: join(dir, "auth.db"),
  registrationKey,
  sessionTtlDays: 30,
});

after(async () => {
  closeAuth();
  await rm(dir, { recursive: true, force: true });
});

test("hashPassword salts every hash and verifies only the right password", async () => {
  const first = await hashPassword("correct horse battery staple");
  const second = await hashPassword("correct horse battery staple");

  assert.notEqual(first, second);
  assert.equal(await verifyPassword("correct horse battery staple", first), true);
  assert.equal(await verifyPassword("wrong password", first), false);
});

test("register, login, authenticate and logout round-trip", async () => {
  const session = await register({ username: "alice", password: "password123", registrationKey });

  assert.ok(session.token.length >= 32);
  assert.equal(session.user.username, "alice");
  assert.deepEqual(authenticate(session.token), { id: session.user.id, username: "alice" });

  const again = await login({ username: "alice", password: "password123" });
  assert.equal(again.user.id, session.user.id);
  assert.ok(authenticate(again.token));

  logout(again.token);
  assert.equal(authenticate(again.token), null);
});

test("rejects a wrong registration key", async () => {
  await assert.rejects(
    register({ username: "mallory", password: "password123", registrationKey: "nope" }),
    (error: { status?: number }) => error.status === 403,
  );
});

test("rejects a duplicate username", async () => {
  await assert.rejects(
    register({ username: "alice", password: "password123", registrationKey }),
    (error: { status?: number }) => error.status === 409,
  );
});

test("rejects a wrong password with a generic 401", async () => {
  await assert.rejects(
    login({ username: "alice", password: "wrong-password" }),
    (error: { status?: number }) => error.status === 401,
  );
});

test("rejects invalid usernames and short passwords", async () => {
  await assert.rejects(
    register({ username: "no spaces allowed", password: "password123", registrationKey }),
    (error: { status?: number }) => error.status === 400,
  );
  await assert.rejects(
    register({ username: "shortpw", password: "short", registrationKey }),
    (error: { status?: number }) => error.status === 400,
  );
});
