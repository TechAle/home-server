import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertEpisodePage,
  assertMediaUrl,
  decodePlaylist,
  extractEmbedUrl,
  extractPlayerData,
  resolveEpisodeMp4,
} from "../src/services/anime/stream.js";
import { signDownload, verifyDownload } from "../src/services/anime/download-token.js";

const pageUrl = "https://www.animesaturn.net/anime/slime-ySAuE/ep-1";
const mediaUrl =
  "https://srv30.sake.streampeaker.org/DDL/ANIME/Slime/Slime_Ep_01_SUB_ITA.mp4?token=9k95&expires=1795836807";
const playerToken = "f884692ea90899c92297419b70ff3e8f";

function encodePlaylist(value: string, token: string): string {
  const bytes = Buffer.from(
    Array.from(value, (char, index) =>
      char.charCodeAt(0) ^ token.charCodeAt(index % token.length),
    ),
  );
  return bytes.toString("base64");
}

function textResponse(body: string): Response {
  return {
    ok: true,
    status: 200,
    url: "",
    text: async () => body,
    json: async () => JSON.parse(body),
  } as unknown as Response;
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    url: "",
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

test("extracts and decodes the embed URL from the episode page", () => {
  const html = `<iframe src="https://play.saturncdn.net/embed/84648?token=${playerToken}&amp;expires=999"></iframe>`;
  assert.equal(
    extractEmbedUrl(html),
    `https://play.saturncdn.net/embed/84648?token=${playerToken}&expires=999`,
  );
  assert.equal(extractEmbedUrl("<html></html>"), null);
});

test("extracts the player data and decodes the playlist", () => {
  const embed = `<script>window.__E={i:84648,k:"${playerToken}",e:999};</script>`;
  assert.deepEqual(extractPlayerData(embed), {
    id: 84648,
    token: playerToken,
    expires: 999,
  });
  assert.equal(extractPlayerData("<html></html>"), null);

  const encoded = encodePlaylist(mediaUrl, playerToken);
  assert.equal(decodePlaylist(encoded, playerToken), mediaUrl);
  assert.notEqual(decodePlaylist(encoded, "wrong"), mediaUrl);
  assert.equal(decodePlaylist("", playerToken), null);
});

test("resolveEpisodeMp4 follows page -> embed -> playlist", async () => {
  const page = `<a href="https://play.saturncdn.net/embed/84648?token=${playerToken}&amp;expires=999">x</a>`;
  const embed = `<script>window.__E={i:84648,k:"${playerToken}",e:999};</script>`;
  const playlist = { d: encodePlaylist(mediaUrl, playerToken) };

  const calls: string[] = [];
  const fetchImpl = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("animesaturn.net")) return textResponse(page);
    if (url.includes("play.saturncdn.net/embed/84648?")) return textResponse(embed);
    if (url.includes("/embed/84648/playlist")) return jsonResponse(playlist);
    throw new Error(`Unexpected URL: ${url}`);
  }) as unknown as typeof fetch;

  assert.equal(await resolveEpisodeMp4(pageUrl, { fetchImpl }), mediaUrl);
  assert.equal(calls.length, 3);
});

test("validates the episode page and the media host", async () => {
  assert.equal(assertEpisodePage(pageUrl).hostname, "www.animesaturn.net");
  assert.throws(() => assertEpisodePage("https://example.com/anime/x/ep-1"));
  assert.throws(() => assertEpisodePage("http://www.animesaturn.net/anime/x/ep-1"));

  assert.equal(assertMediaUrl(mediaUrl).hostname, "srv30.sake.streampeaker.org");
  assert.throws(() => assertMediaUrl("https://evil.example/media.mp4"));
  assert.throws(() => assertMediaUrl("https://srv30.sake.streampeaker.org/media.m3u8"));
});

test("download signatures are bound to the file and expire", () => {
  const signed = signDownload("0123456789abcdef0123.mp4");
  assert.equal(verifyDownload("0123456789abcdef0123.mp4", signed.expires, signed.sig), true);
  assert.equal(verifyDownload("other.mp4", signed.expires, signed.sig), false);
  assert.equal(verifyDownload("0123456789abcdef0123.mp4", signed.expires + 1, signed.sig), false);
  assert.equal(verifyDownload("0123456789abcdef0123.mp4", Date.now() - 1, signed.sig), false);
  assert.equal(verifyDownload("0123456789abcdef0123.mp4", signed.expires, "bad"), false);
});
