/**
 * SQLite persistence for users and sessions (better-sqlite3, synchronous).
 *
 * A factory instead of a singleton so tests can open a throwaway database.
 */
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface UserRecord {
  id: number;
  username: string;
}

export interface UserWithHash extends UserRecord {
  passwordHash: string;
}

export interface SessionRecord {
  userId: number;
  username: string;
  expiresAt: string;
}

export interface AuthStore {
  createUser(username: string, passwordHash: string): UserRecord;
  findUserByUsername(username: string): UserWithHash | undefined;
  createSession(userId: number, tokenHash: string, expiresAt: string): void;
  findSession(tokenHash: string): SessionRecord | undefined;
  deleteSession(tokenHash: string): void;
  deleteExpiredSessions(now: string): void;
  close(): void;
}

interface UserRow {
  id: number;
  username: string;
  passwordHash: string;
}

interface SessionRow {
  userId: number;
  username: string;
  expiresAt: string;
}

export function createAuthStore(databasePath: string): AuthStore {
  if (databasePath !== ":memory:") {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT    NOT NULL UNIQUE,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_expires_at ON sessions(expires_at);
  `);

  const insertUser = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
  const selectUser = db.prepare(
    "SELECT id, username, password_hash AS passwordHash FROM users WHERE username = ?",
  );
  const insertSession = db.prepare(
    "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
  );
  const selectSession = db.prepare(`
    SELECT s.user_id AS userId, u.username AS username, s.expires_at AS expiresAt
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
  `);
  const removeSession = db.prepare("DELETE FROM sessions WHERE token_hash = ?");
  const removeExpired = db.prepare("DELETE FROM sessions WHERE expires_at <= ?");

  return {
    createUser(username, passwordHash) {
      const info = insertUser.run(username, passwordHash);
      return { id: Number(info.lastInsertRowid), username };
    },

    findUserByUsername(username) {
      return selectUser.get(username) as UserRow | undefined;
    },

    createSession(userId, tokenHash, expiresAt) {
      insertSession.run(userId, tokenHash, expiresAt);
    },

    findSession(tokenHash) {
      return selectSession.get(tokenHash) as SessionRow | undefined;
    },

    deleteSession(tokenHash) {
      removeSession.run(tokenHash);
    },

    deleteExpiredSessions(now) {
      removeExpired.run(now);
    },

    close() {
      db.close();
    },
  };
}
