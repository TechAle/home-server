/**
 * Episode downloads: start a job, poll its progress, stream the finished file.
 * The file route is reachable without a Bearer header only with a valid signed
 * URL, because <video> range requests do not carry custom headers.
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { Request } from "express";
import { route } from "../../rules.js";
import {
  deleteDownload,
  downloadFilePath,
  getDownload,
  listDownloads,
  startDownload,
  type DownloadView,
} from "../anime/downloads.js";

function readBody(req: Request): Record<string, unknown> {
  const body: unknown = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  return body as Record<string, unknown>;
}

function notFound(): Error & { status: number } {
  return Object.assign(new Error("Download not found."), { status: 404 });
}

export default class AnimeDownloadManager {
  start = route("/anime/download", ["POST"])(async (req): Promise<DownloadView> => {
    const body = readBody(req);
    return startDownload({
      url: typeof body.url === "string" ? body.url : "",
      title: typeof body.title === "string" ? body.title : "",
      episode: Number(body.episode),
    });
  });

  status = route("/anime/download/:id", ["GET"])(async (req): Promise<DownloadView> => {
    const view = getDownload(req.params.id);
    if (!view) throw notFound();
    return view;
  });

  list = route("/anime/downloads", ["GET"])(async (req): Promise<DownloadView[]> => {
    const title = typeof req.query.title === "string" ? req.query.title : "";
    if (!title) {
      throw Object.assign(new Error("Missing title query parameter."), { status: 400 });
    }
    return listDownloads(title);
  });

  remove = route("/anime/download/:id", ["DELETE"])(async (req) => {
    await deleteDownload(req.params.id);
    return { ok: true };
  });

  file = route("/downloads/:file", ["GET", "HEAD"])(async (req, res) => {
    const path = downloadFilePath(req.params.file);
    if (!path) throw notFound();

    let size: number;
    try {
      size = (await stat(path)).size;
    } catch {
      throw notFound();
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");

    const range = req.headers.range;
    if (!range) {
      res.setHeader("Content-Length", String(size));
      res.status(200);
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      res.flushHeaders();
      createReadStream(path).pipe(res);
      return;
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
      return;
    }

    let start: number;
    let end: number;
    if (match[1] === "") {
      const suffix = Number(match[2]);
      if (!Number.isInteger(suffix) || suffix <= 0) {
        res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
        return;
      }
      start = Math.max(0, size - suffix);
      end = size - 1;
    } else {
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : size - 1;
    }

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      start >= size ||
      end < start
    ) {
      res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
      return;
    }

    end = Math.min(end, size - 1);
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
    res.setHeader("Content-Length", String(end - start + 1));
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    res.flushHeaders();
    createReadStream(path, { start, end }).pipe(res);
  });
}
