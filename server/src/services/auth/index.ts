/**
 * Auth domain: registration, login, session validation and logout.
 *
 * This module owns the singleton store that `createApp` configures at boot.
 * Routes live in `services/executables/auth-manager.ts`; the Express guard in
 * `middleware.ts` uses `authenticate()` for every protected route.
 */
import type { AuthConfig } from "../../config.js";
import { hashPassword, verifyPassword } from "./passwords.js";
import { createAuthStore, type AuthStore, type UserRecord } from "./store.js";
import { compareSecrets, generateToken, hashToken } from "./tokens.js";

export interface AuthUser {
  id: number;
  username: string;
}

export interface AuthSession {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

export interface RegisterInput {
  username?: unknown;
  password?: unknown;
  registrationKey?: unknown;
}

export interface LoginInput {
  username?: unknown;
  password?: unknown;
}

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,32}$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 200;

let store: AuthStore | null = null;
let config: AuthConfig | null = null;
let dummyHash: Promise<string> | null = null;

/**
 * A real scrypt hash for a throwaway password, used for unknown usernames so
 * login timing does not reveal whether an account exists.
 */
function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword("timing-equalizer");
  return dummyHash;
}

export function configureAuth(next: AuthConfig): void {
  store?.close();
  store = createAuthStore(next.databasePath);
  config = next;
}

export function closeAuth(): void {
  store?.close();
  store = null;
  config = null;
}

function requireAuthDependencies(): { store: AuthStore; config: AuthConfig } {
  if (!store || !config) throw new Error("Auth store is not configured");
  return { store, config };
}

function authError(status: number, message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

function readUsername(value: unknown): string {
  const username = typeof value === "string" ? value.trim() : "";
  if (!USERNAME_PATTERN.test(username)) {
    throw authError(400, "Username must be 3-32 characters (letters, numbers, dot, dash, underscore).");
  }
  return username;
}

function readPassword(value: unknown): string {
  const password = typeof value === "string" ? value : "";
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    throw authError(400, `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`);
  }
  return password;
}

function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && code.startsWith("SQLITE_CONSTRAINT");
}

function createSession(user: UserRecord): AuthSession {
  const { store: authStore, config: authConfig } = requireAuthDependencies();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + authConfig.sessionTtlDays * 86_400_000).toISOString();

  authStore.deleteExpiredSessions(new Date().toISOString());
  authStore.createSession(user.id, hashToken(token), expiresAt);

  return { token, expiresAt, user: { id: user.id, username: user.username } };
}

export async function register(input: RegisterInput): Promise<AuthSession> {
  const { store: authStore, config: authConfig } = requireAuthDependencies();

  if (!authConfig.registrationKey) {
    throw authError(503, "Registration is disabled: set REGISTRATION_KEY in server/.env.");
  }
  if (typeof input.registrationKey !== "string" || !compareSecrets(input.registrationKey, authConfig.registrationKey)) {
    throw authError(403, "Invalid registration key.");
  }

  const username = readUsername(input.username);
  const password = readPassword(input.password);

  if (authStore.findUserByUsername(username)) {
    throw authError(409, "Username already taken.");
  }

  const passwordHash = await hashPassword(password);

  let user: UserRecord;
  try {
    user = authStore.createUser(username, passwordHash);
  } catch (error) {
    if (isUniqueViolation(error)) throw authError(409, "Username already taken.");
    throw error;
  }

  return createSession(user);
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const { store: authStore } = requireAuthDependencies();

  const username = typeof input.username === "string" ? input.username.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (!username || !password) {
    throw authError(401, "Invalid username or password.");
  }

  const user = authStore.findUserByUsername(username);
  // Unknown users must still pay the scrypt cost, otherwise response timing
  // reveals which usernames exist.
  const passwordMatches = await verifyPassword(
    password,
    user ? user.passwordHash : await dummyPasswordHash(),
  );
  if (!user || !passwordMatches) {
    throw authError(401, "Invalid username or password.");
  }

  return createSession(user);
}

/** Resolve a bearer token to its user; expired sessions are removed. */
export function authenticate(token: string): AuthUser | null {
  if (!token) return null;
  const { store: authStore } = requireAuthDependencies();

  const tokenHash = hashToken(token);
  const session = authStore.findSession(tokenHash);
  if (!session) return null;

  if (session.expiresAt <= new Date().toISOString()) {
    authStore.deleteSession(tokenHash);
    return null;
  }

  return { id: session.userId, username: session.username };
}

export function logout(token: string): void {
  if (!token) return;
  const { store: authStore } = requireAuthDependencies();
  authStore.deleteSession(hashToken(token));
}
