/**
 * Configuration — reads `server/configuration.json` (non-secret settings) and
 * `server/.env` (secrets).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import dotenv from "dotenv";

/** server/ — the folder that contains configuration.json, .env and templates/. */
export const serverRoot = new URL("../", import.meta.url).pathname;

export interface AniListConfig {
  api: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken: string;
}

export interface AppConfig {
  anilist: AniListConfig;
  templates: string;
}

interface ConfigurationFile {
  anilist?: {
    api?: string;
    clientId?: string;
    redirectUri?: string;
  };
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
    templates: join(root, "templates"),
  };
}

export function requireEnv(name: string): string {
  const value = (process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy server/.env.example to server/.env and fill in the value.`,
    );
  }
  return value;
}
