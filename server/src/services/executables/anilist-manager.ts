/**
 * AnilistManager — the service adapter the loader discovers: it owns the
 * configuration and the `/get_anime` route. The moving parts live outside
 * `executables/` so the loader never instantiates them.
 *
 * Output shape:
 *   { [animeTitle]: { mediaId, status, progress, episodes, episodeBase, link, nextEpisode } }
 */
import { route } from "../../rules.js";
import { createAniListClient, type AniListClient, type AniListEntry } from "../anilist/client.js";
import { nextEpisodeLink } from "../anilist/links.js";
import { nextEpisodeState, type NextEpisode } from "../anilist/next-episode.js";
import type { AniListConfig } from "../../config.js";
import type { Logger } from "../../registry.js";

export interface AnimeToWatch {
  mediaId: number;
  status: string;
  progress: number;
  /** Episodes available to download (aired or total for completed shows). */
  episodes: number;
  /** AniSaturn anime URL without the trailing `/ep-N`. */
  episodeBase: string;
  link: string[];
  nextEpisode: NextEpisode | null;
}

export type ToWatch = Record<string, AnimeToWatch>;

interface Candidate {
  entry: AniListEntry;
  title: string;
  waiting: boolean;
  nextEpisode: NextEpisode | null;
}

export default class AnilistManager {
  #client: AniListClient | null = null;
  #log: Logger = console;

  api = "https://graphql.anilist.co";
  clientId = "";
  clientSecret = "";
  redirectUri = "";
  accessToken = "";

  /** Called by the loader once the configuration is available. */
  configure(anilist: Partial<AniListConfig>, log: Logger = console): this {
    Object.assign(this, anilist);
    this.#log = log;
    // Rebuild lazily with the new token/API on the next request.
    this.#client = null;
    return this;
  }

  get client(): AniListClient {
    this.#client ??= createAniListClient({ api: this.api, accessToken: this.accessToken });
    return this.#client;
  }

  getAnime = route("/get_anime", ["GET"])(async (): Promise<ToWatch> => {
    const tracked = await this.client.trackedAnime();

    const candidates: Candidate[] = tracked
      .filter((entry) => Boolean(entry.media.title.english || entry.media.title.romaji))
      .map((entry) => {
        const title = (entry.media.title.english || entry.media.title.romaji) as string;
        return { entry, title, ...nextEpisodeState(entry.media, entry.progress) };
      });

    const links = await Promise.all(
      candidates.map(async ({ entry, title, waiting }) => {
        if (waiting) return [];
        try {
          return (await nextEpisodeLink(title, entry.progress, entry.media.startDate?.year)) as string[];
        } catch (error) {
          const err = error as { message?: string };
          this.#log.warn?.(`[anilist] ${title}: ${err?.message ?? error}`);
          return [];
        }
      }),
    );

    const toWatch: ToWatch = {};
    candidates.forEach(({ entry, title, nextEpisode }, index) => {
      const link = links[index] ?? [];
      const episodeBase = link[0]?.replace(/\/ep-\d+\/?$/, "") ?? "";
      const total = Number(entry.media.episodes ?? 0);
      const next = Number(entry.media.nextAiringEpisode?.episode ?? 0);
      const lastAired = next > 1 ? next - 1 : 0;
      const episodes =
        lastAired > 0
          ? Math.min(total > 0 ? total : lastAired, lastAired)
          : total > 0
            ? total
            : Math.max(1, entry.progress + 1);

      toWatch[title] = {
        mediaId: entry.media.id,
        status: entry.status,
        progress: entry.progress,
        episodes,
        episodeBase,
        link,
        nextEpisode,
      };
    });

    return toWatch;
  });

  markWatched = route("/anime/watched", ["POST"])(async req => {
    const body: unknown = req.body;
    const payload =
      body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const mediaId = Number(payload.mediaId);
    const progress = Number(payload.progress);

    if (
      !Number.isInteger(mediaId) ||
      mediaId <= 0 ||
      !Number.isInteger(progress) ||
      progress < 0
    ) {
      throw Object.assign(
        new Error("mediaId must be a positive integer and progress a non-negative integer."),
        { status: 400 },
      );
    }

    await this.client.saveProgress(mediaId, progress);
    return { mediaId, progress };
  });
}
