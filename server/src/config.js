/**
 * Configuration — reads `server/configuration.json` (non-secret settings) and
 * `server/.env` (secrets), exactly like the Flask project does with
 * `python-dotenv` + `configurationPath`.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import dotenv from "dotenv";

/** server/ — the folder that contains configuration.json, .env and templates/. */
export const serverRoot = new URL("../", import.meta.url).pathname;

export async function loadConfiguration(root = serverRoot) {
  const file = join(root, "configuration.json");
  const raw = await readFile(file, "utf8");
  const config = JSON.parse(raw);

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

export function requireEnv(name) {
  const value = (process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy server/.env.example to server/.env and fill in the value.`,
    );
  }
  return value;
}
