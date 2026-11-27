/**
 * Resolve the direct MP4 of an AniSaturn episode.
 *
 * The episode page embeds `play.saturncdn.net/embed/<id>?token=…&expires=…`.
 * That player calls `/embed/<id>/playlist?token=…&expires=…`, which returns a
 * base64 payload XORed with the token; decoded it is a signed MP4 URL on
 * `*.streampeaker.org`. Tokens are short lived, so a download resolves a fresh
 * URL every time.
 */
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36";

const ANISATURN_PAGE = /^https:\/\/(?:www\.)?animesaturn\.net\/(?:anime|episode)\//i;
const ANISATURN_HOSTS = new Set(["animesaturn.net", "www.animesaturn.net"]);
const EMBED_HOST = "play.saturncdn.net";
const MEDIA_HOST = /(^|\.)(streampeaker\.org|saturncdn\.net)$/i;
const MEDIA_PATH = /\.mp4$/i;

function httpError(status: number, message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

export function assertEpisodePage(value: string): URL {
  if (!value) throw httpError(400, "Missing episode URL.");

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw httpError(400, "Invalid episode URL.");
  }

  if (parsed.protocol !== "https:" || !ANISATURN_HOSTS.has(parsed.hostname)) {
    throw httpError(400, "Only AniSaturn episode URLs are allowed.");
  }
  if (!ANISATURN_PAGE.test(parsed.toString())) {
    throw httpError(400, "Not an AniSaturn episode page.");
  }
  return parsed;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/");
}

/** `https://play.saturncdn.net/embed/…` from the episode HTML. */
export function extractEmbedUrl(html: string): string | null {
  const match = /(https:\/\/play\.saturncdn\.net\/embed\/[^"'\s<>\\]+)/i.exec(html);
  if (!match?.[1]) return null;

  const decoded = decodeEntities(match[1]);
  try {
    const url = new URL(decoded);
    return url.protocol === "https:" && url.hostname === EMBED_HOST ? url.toString() : null;
  } catch {
    return null;
  }
}

export interface PlayerData {
  id: number;
  token: string;
  expires: number;
}

/** `window.__E={i:84648,k:"…",e:1795836778}` from the embed HTML. */
export function extractPlayerData(html: string): PlayerData | null {
  const match = /window\.__E\s*=\s*\{\s*i\s*:\s*(\d+)\s*,\s*k\s*:\s*"([^"]+)"\s*,\s*e\s*:\s*(\d+)/i.exec(
    html,
  );
  if (!match) return null;

  const id = Number(match[1]);
  const expires = Number(match[3]);
  if (!Number.isInteger(id) || id <= 0 || !match[2] || !Number.isFinite(expires)) {
    return null;
  }
  return { id, token: match[2], expires };
}

/** The playlist `d` field is base64 + XOR with the player token. */
export function decodePlaylist(encoded: string, token: string): string | null {
  try {
    const bytes = Buffer.from(encoded, "base64");
    if (bytes.length === 0 || !token) return null;

    let decoded = "";
    for (let i = 0; i < bytes.length; i += 1) {
      decoded += String.fromCharCode(bytes[i] ^ token.charCodeAt(i % token.length));
    }
    return decoded;
  } catch {
    return null;
  }
}

/** Validate the signed media URL before the server fetches it. */
export function assertMediaUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw httpError(502, "The player returned an invalid media URL.");
  }

  if (url.protocol !== "https:" || !MEDIA_HOST.test(url.hostname) || !MEDIA_PATH.test(url.pathname)) {
    throw httpError(502, "The player returned an unsupported media URL.");
  }
  return url;
}

export interface ResolveOptions {
  fetchImpl?: typeof fetch;
  userAgent?: string;
}

export async function resolveEpisodeMp4(
  pageUrl: string,
  { fetchImpl = globalThis.fetch, userAgent = USER_AGENT }: ResolveOptions = {},
): Promise<string> {
  const page = assertEpisodePage(pageUrl);
  const headers = { Accept: "text/html", "User-Agent": userAgent };

  const pageResponse = await fetchImpl(page.toString(), {
    headers,
    signal: AbortSignal.timeout(10_000),
  });
  if (!pageResponse.ok) {
    throw httpError(502, `AniSaturn answered ${pageResponse.status}.`);
  }

  const embedUrl = extractEmbedUrl(await pageResponse.text());
  if (!embedUrl) {
    throw httpError(502, "Player not found on the AniSaturn page.");
  }

  const embedResponse = await fetchImpl(embedUrl, {
    headers: { ...headers, Referer: page.toString() },
    signal: AbortSignal.timeout(10_000),
  });
  if (!embedResponse.ok) {
    throw httpError(502, `Player answered ${embedResponse.status}.`);
  }

  const player = extractPlayerData(await embedResponse.text());
  if (!player) {
    throw httpError(502, "Player data not found in the embed page.");
  }

  const playlistUrl = new URL(`https://${EMBED_HOST}/embed/${player.id}/playlist`);
  playlistUrl.searchParams.set("token", player.token);
  playlistUrl.searchParams.set("expires", String(player.expires));

  const playlistResponse = await fetchImpl(playlistUrl.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": userAgent,
      // The playlist endpoint checks that the request comes from its player.
      Referer: `https://${EMBED_HOST}/embed/${player.id}`,
      Origin: `https://${EMBED_HOST}`,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!playlistResponse.ok) {
    throw httpError(502, `Playlist answered ${playlistResponse.status}.`);
  }

  const payload = (await playlistResponse.json()) as { d?: unknown };
  if (typeof payload.d !== "string") {
    throw httpError(502, "Playlist response is missing the media URL.");
  }

  const decoded = decodePlaylist(payload.d, player.token);
  if (!decoded) {
    throw httpError(502, "Could not decode the media URL.");
  }

  return assertMediaUrl(decoded).toString();
}
