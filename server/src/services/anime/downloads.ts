/**
 * Server-side episode downloads.
 *
 * Resolving the player gives a signed MP4 on *.streampeaker.org. The server
 * streams it to `server/data/downloads`, persists an index (so the completed
 * library survives restarts) and serves finished files through signed Range
 * URLs. Active jobs can be cancelled; finished files can be deleted.
 */
import { createHash, randomUUID } from "node:crypto";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { readdir, rename, rm, stat, statfs } from "node:fs/promises";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { serverRoot } from "../../config.js";
import { signDownload } from "./download-token.js";
import { assertEpisodePage, assertMediaUrl, resolveEpisodeMp4 } from "./stream.js";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36";
const DOWNLOADS_DIR = join(serverRoot, "data", "downloads");
const INDEX_PATH = join(DOWNLOADS_DIR, "index.json");
const MAX_BYTES = 2 * 1024 ** 3;
const MAX_ACTIVE = 3;
const KEEP_FILES = 10;
const FILE_PATTERN = /^[a-f0-9]{20}\.mp4$/;

mkdirSync(DOWNLOADS_DIR, { recursive: true, mode: 0o700 });

export type DownloadStatus = "downloading" | "done" | "error";

interface Job {
  id: string;
  key: string;
  title: string;
  episode: number;
  file: string;
  status: DownloadStatus;
  bytes: number;
  total: number;
  error?: string;
  createdAt: number;
  /** Snapshot of the AniList entry when the download started. */
  mediaId: number;
  episodeBase: string;
  animeStatus: string;
  animeProgress: number;
  abort?: AbortController;
  cancelled?: boolean;
}

interface StoredDownload {
  id: string;
  key: string;
  title: string;
  episode: number;
  file: string;
  bytes: number;
  createdAt: number;
  mediaId?: number;
  episodeBase?: string;
  animeStatus?: string;
  animeProgress?: number;
}

export interface DownloadView {
  id: string;
  title: string;
  episode: number;
  status: DownloadStatus;
  /** 0–100, one decimal. */
  progress: number;
  bytes: number;
  total: number;
  error?: string;
  /** Relative URL on the API host; signed for the WebView. */
  playUrl?: string;
  mediaId: number;
  episodeBase: string;
  animeStatus: string;
  animeProgress: number;
}

export interface DownloadInput {
  url: string;
  title: string;
  episode: number;
  mediaId?: number;
  episodeBase?: string;
  status?: string;
  animeProgress?: number;
}

const jobs = new Map<string, Job>();
loadIndex();

function httpError(status: number, message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

function view(job: Job): DownloadView {
  const result: DownloadView = {
    id: job.id,
    title: job.title,
    episode: job.episode,
    status: job.status,
    progress:
      job.total > 0 ? Math.min(100, Math.round((job.bytes / job.total) * 1000) / 10) : 0,
    bytes: job.bytes,
    total: job.total,
    mediaId: job.mediaId,
    episodeBase: job.episodeBase,
    animeStatus: job.animeStatus,
    animeProgress: job.animeProgress,
  };

  if (job.error) result.error = job.error;
  if (job.status === "done") {
    const signed = signDownload(job.file);
    result.playUrl = `/downloads/${job.file}?expires=${signed.expires}&sig=${encodeURIComponent(signed.sig)}`;
  }
  return result;
}

function saveIndex(): void {
  try {
    const entries: StoredDownload[] = [...jobs.values()]
      .filter((job) => job.status === "done")
      .map((job) => ({
        id: job.id,
        key: job.key,
        title: job.title,
        episode: job.episode,
        file: job.file,
        bytes: job.bytes,
        createdAt: job.createdAt,
        mediaId: job.mediaId,
        episodeBase: job.episodeBase,
        animeStatus: job.animeStatus,
        animeProgress: job.animeProgress,
      }));
    writeFileSync(INDEX_PATH, JSON.stringify({ entries }, null, 2), { mode: 0o600 });
  } catch {
    // The media still works without the index; the next run retries.
  }
}

function loadIndex(): void {
  let raw: string;
  try {
    raw = readFileSync(INDEX_PATH, "utf8");
  } catch {
    return;
  }

  try {
    const parsed = JSON.parse(raw) as { entries?: StoredDownload[] };
    for (const entry of parsed.entries ?? []) {
      if (
        !entry ||
        typeof entry.id !== "string" ||
        typeof entry.key !== "string" ||
        typeof entry.title !== "string" ||
        !Number.isInteger(entry.episode) ||
        typeof entry.file !== "string" ||
        !FILE_PATTERN.test(entry.file)
      ) {
        continue;
      }

      try {
        const info = statSync(join(DOWNLOADS_DIR, entry.file));
        jobs.set(entry.id, {
          id: entry.id,
          key: entry.key,
          title: entry.title,
          episode: entry.episode,
          file: entry.file,
          status: "done",
          bytes: info.size,
          total: info.size,
          createdAt: Number(entry.createdAt) || Date.now(),
          mediaId: Number(entry.mediaId) || 0,
          episodeBase: typeof entry.episodeBase === "string" ? entry.episodeBase : "",
          animeStatus:
            typeof entry.animeStatus === "string" ? entry.animeStatus : "CURRENT",
          animeProgress: Number(entry.animeProgress) || 0,
        });
      } catch {
        // File removed outside the app: drop the entry.
      }
    }
    saveIndex();
  } catch {
    // Corrupt index: start clean.
  }
}

function activeCount(): number {
  return [...jobs.values()].filter((job) => job.status === "downloading").length;
}

async function freeBytes(): Promise<number> {
  try {
    const stats = await statfs(DOWNLOADS_DIR);
    return stats.bsize * stats.bavail;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

async function downloadToFile(
  url: string,
  destination: string,
  onProgress: (bytes: number, total: number) => void,
  signal: AbortSignal,
): Promise<number> {
  const response = await fetch(url, {
    headers: {
      Accept: "video/mp4,*/*",
      "User-Agent": USER_AGENT,
      Referer: "https://play.saturncdn.net/",
    },
    redirect: "follow",
    signal,
  });

  if (!response.ok) {
    throw httpError(502, `Media server answered ${response.status}.`);
  }
  if (response.url) {
    assertMediaUrl(response.url);
  }

  const total = Number(response.headers.get("content-length") ?? 0);
  if (total > MAX_BYTES) {
    throw httpError(413, "Episode is larger than the 2 GB limit.");
  }

  const free = await freeBytes();
  if (total > 0 && free < total + 200 * 1024 ** 2) {
    throw httpError(507, "Not enough disk space for this download.");
  }

  if (!response.body) {
    throw httpError(502, "Media server returned an empty body.");
  }

  const temp = `${destination}.part`;
  let bytes = 0;
  const counter = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > MAX_BYTES) {
        callback(httpError(413, "Episode is larger than the 2 GB limit."));
        return;
      }
      onProgress(bytes, total);
      callback(null, chunk);
    },
  });

  try {
    const source = Readable.fromWeb(
      response.body as unknown as Parameters<typeof Readable.fromWeb>[0],
    );
    await pipeline(source, counter, createWriteStream(temp, { mode: 0o600 }));
    await rename(temp, destination);
    return bytes;
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

async function run(job: Job, pageUrl: string): Promise<void> {
  const controller = new AbortController();
  job.abort = controller;
  const timeout = setTimeout(() => controller.abort(), 30 * 60_000);

  try {
    const mediaUrl = await resolveEpisodeMp4(pageUrl);
    job.total = 0;
    const bytes = await downloadToFile(
      mediaUrl,
      join(DOWNLOADS_DIR, job.file),
      (done, total) => {
        job.bytes = done;
        if (total > 0) job.total = total;
      },
      controller.signal,
    );
    if (job.cancelled || !jobs.has(job.id)) return;

    job.bytes = bytes;
    job.status = "done";
    saveIndex();
    void cleanup();
  } catch (error) {
    if (job.cancelled || !jobs.has(job.id)) {
      await rm(join(DOWNLOADS_DIR, job.file), { force: true });
      await rm(join(DOWNLOADS_DIR, `${job.file}.part`), { force: true });
      return;
    }
    const failure = error as { message?: string };
    job.status = "error";
    job.error = failure.message ?? "Download failed.";
    await rm(join(DOWNLOADS_DIR, job.file), { force: true });
  } finally {
    clearTimeout(timeout);
    job.abort = undefined;
  }
}

/** Keep the newest files (and active jobs) so the SD card does not fill up. */
async function cleanup(): Promise<void> {
  try {
    const names = await readdir(DOWNLOADS_DIR);
    const activeFiles = new Set(
      [...jobs.values()].filter((job) => job.status === "downloading").map((job) => job.file),
    );

    const files = [] as Array<{ name: string; mtime: number }>;
    for (const name of names) {
      if (!FILE_PATTERN.test(name) || activeFiles.has(name)) continue;
      try {
        const info = await stat(join(DOWNLOADS_DIR, name));
        files.push({ name, mtime: info.mtimeMs });
      } catch {
        // Ignore files removed while we were scanning.
      }
    }

    files.sort((a, b) => b.mtime - a.mtime);
    let removed = false;
    for (const file of files.slice(KEEP_FILES)) {
      await rm(join(DOWNLOADS_DIR, file.name), { force: true });
      for (const [id, job] of jobs) {
        if (job.file === file.name) jobs.delete(id);
      }
      removed = true;
    }
    if (removed) saveIndex();

    for (const name of names) {
      if (!name.endsWith(".part")) continue;
      try {
        const info = await stat(join(DOWNLOADS_DIR, name));
        if (Date.now() - info.mtimeMs > 24 * 60 * 60 * 1000) {
          await rm(join(DOWNLOADS_DIR, name), { force: true });
        }
      } catch {
        // Ignore.
      }
    }
  } catch {
    // Cleanup must never break a download.
  }
}

function metadata(input: DownloadInput): {
  mediaId: number;
  episodeBase: string;
  animeStatus: string;
  animeProgress: number;
} {
  const mediaId = Number(input.mediaId ?? 0);
  const animeProgress = Number(input.animeProgress ?? 0);
  const animeStatus = ["CURRENT", "PLANNING", "REPEATING"].includes(
    String(input.status ?? ""),
  )
    ? String(input.status)
    : "CURRENT";

  return {
    mediaId: Number.isInteger(mediaId) && mediaId > 0 ? mediaId : 0,
    episodeBase: typeof input.episodeBase === "string" ? input.episodeBase : "",
    animeStatus,
    animeProgress: Number.isInteger(animeProgress) && animeProgress >= 0 ? animeProgress : 0,
  };
}

export function startDownload(input: DownloadInput): DownloadView {
  const page = assertEpisodePage(input.url);
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const episode = Number(input.episode);

  if (!title || title.length > 200) {
    throw httpError(400, "A title between 1 and 200 characters is required.");
  }
  if (!Number.isInteger(episode) || episode <= 0) {
    throw httpError(400, "Episode must be a positive integer.");
  }

  const meta = metadata(input);
  const key = `${title.toLowerCase()}|${episode}|${page.toString()}`;
  const file = `${createHash("sha256").update(key).digest("hex").slice(0, 20)}.mp4`;
  const existing = [...jobs.values()].find((job) => job.key === key);
  if (existing) {
    if (existing.status === "downloading") {
      return view(existing);
    }
    if (existing.status === "done" && existsSync(join(DOWNLOADS_DIR, existing.file))) {
      return view(existing);
    }
    // Failed or file removed: start a clean job.
    jobs.delete(existing.id);
  }

  // A file downloaded before the index existed (or by a previous process) is
  // still a valid, finished episode.
  if (!existing && existsSync(join(DOWNLOADS_DIR, file))) {
    try {
      const info = statSync(join(DOWNLOADS_DIR, file));
      const job: Job = {
        id: randomUUID(),
        key,
        title,
        episode,
        file,
        status: "done",
        bytes: info.size,
        total: info.size,
        createdAt: Date.now(),
        ...meta,
      };
      jobs.set(job.id, job);
      saveIndex();
      void cleanup();
      return view(job);
    } catch {
      // Fall through and download it again.
    }
  }

  if (activeCount() >= MAX_ACTIVE) {
    throw httpError(503, "Too many downloads in progress. Try again later.");
  }

  const id = randomUUID();
  const job: Job = {
    id,
    key,
    title,
    episode,
    file,
    status: "downloading",
    bytes: 0,
    total: 0,
    createdAt: Date.now(),
    ...meta,
  };

  jobs.set(id, job);
  void run(job, page.toString());
  void cleanup();
  return view(job);
}

export function getDownload(id: string): DownloadView | null {
  const job = jobs.get(id);
  return job ? view(job) : null;
}

/**
 * With a title: every job for that anime (active, done, error).
 * Without a title: the completed library across all anime.
 */
export function listDownloads(title?: string): DownloadView[] {
  const all = [...jobs.values()];
  if (!title) {
    return all
      .filter((job) => job.status === "done")
      .sort((a, b) => a.title.localeCompare(b.title) || a.episode - b.episode)
      .map(view);
  }

  const wanted = title.trim().toLowerCase();
  return all
    .filter((job) => job.title.toLowerCase() === wanted)
    .sort((a, b) => a.episode - b.episode)
    .map(view);
}

export async function deleteDownload(id: string): Promise<void> {
  const job = jobs.get(id);
  if (!job) throw httpError(404, "Download not found.");

  if (job.status === "downloading") {
    // Cancel: abort the request, drop the job and clean partial/final files.
    job.cancelled = true;
    job.abort?.abort();
    jobs.delete(id);
    await rm(join(DOWNLOADS_DIR, `${job.file}.part`), { force: true });
    await rm(join(DOWNLOADS_DIR, job.file), { force: true });
    return;
  }

  await rm(join(DOWNLOADS_DIR, job.file), { force: true });
  jobs.delete(id);
  saveIndex();
}

/** Absolute path for a signed download, or null for an invalid name. */
export function downloadFilePath(file: string): string | null {
  if (!FILE_PATTERN.test(file)) return null;
  return join(DOWNLOADS_DIR, file);
}
