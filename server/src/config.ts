/**
 * Configuration — reads `server/configuration.json` (non-secret settings) and
 * `server/.env` (secrets).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

/** server/ — the folder that contains configuration.json, .env and templates/. */
export const serverRoot = fileURLToPath(new URL("../", import.meta.url));

export interface AniListConfig {
  api: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken: string;
}

export interface AuthConfig {
  /** SQLite file holding users and sessions. */
  databasePath: string;
  /** Static key required by POST /auth/register; empty disables registration. */
  registrationKey: string;
  /** How long a session token stays valid. */
  sessionTtlDays: number;
}

export interface AppConfig {
  anilist: AniListConfig;
  auth: AuthConfig;
  templates: string;
}

interface ConfigurationFile {
  anilist?: {
    api?: string;
    clientId?: string;
    redirectUri?: string;
  };
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function loadConfiguration(root: string = serverRoot): Promise<AppConfig> {
  const raw = await readFile(join(root, "configuration.json"), "utf8");
  const config = JSON.parse(raw) as ConfigurationFile;

  dotenv.config({ path: join(root, ".env"), quiet: true });

  return {
    anilist: {
      api: config.anilist?.api ?? "https://graphql.anilist.co",
      clientId: config.anilist?.clientId ?? "",
      clientSecret: process.env.ANILIST_CLIENT_SECRET ?? "",
      redirectUri: config.anilist?.redirectUri ?? "",
      accessToken: process.env.ANILIST_ACCESS_TOKEN ?? "",
    },
    auth: {
      databasePath: (process.env.DATABASE_PATH ?? "").trim() || join(root, "data", "home-server.db"),
      registrationKey: (process.env.REGISTRATION_KEY ?? "").trim(),
      sessionTtlDays: positiveNumber(process.env.SESSION_TTL_DAYS, 30),
    },
    templates: join(root, "templates"),
  };
}
