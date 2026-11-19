/**
 * AnilistManager — the service adapter the loader discovers: it owns the
 * configuration and the `/get_anime` route. The moving parts live outside
 * `executables/` so the loader never instantiates them.
 *
 * Output shape:
 *   { [animeTitle]: { progress: number, link: string[], nextEpisode: object | null } }
 */
import { route, type RouteHandler } from "../../rules.js";
import { createAniListClient, type AniListClient, type AniListEntry } from "../anilist/client.js";
import { nextEpisodeLink } from "../anilist/links.js";
import { nextEpisodeState, type NextEpisode } from "../anilist/next-episode.js";
import type { AniListConfig } from "../../config.js";

export interface AnimeToWatch {
  progress: number;
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

  api = "https://graphql.anilist.co";
  clientId = "";
  clientSecret = "";
  redirectUri = "";
  accessToken = "";

  /** Called by the loader once the configuration is available. */
  configure(anilist: Partial<AniListConfig>): this {
    Object.assign(this, anilist);
    // Rebuild lazily with the new token/API on the next request.
    this.#client = null;
    return this;
  }

  get client(): AniListClient {
    this.#client ??= createAniListClient({ api: this.api, accessToken: this.accessToken });
    return this.#client;
  }

  getAnime = route("/get_anime", ["GET"])(async (): Promise<ToWatch> => {
    const watching = await this.client.watchingAnime();

    const candidates: Candidate[] = watching
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
          console.warn(`[anilist] ${title}: ${err?.message ?? error}`);
          return [];
        }
      }),
    );

    const toWatch: ToWatch = {};
    candidates.forEach(({ entry, title, nextEpisode }, index) => {
      toWatch[title] = { progress: entry.progress, link: links[index] ?? [], nextEpisode };
    });

    return toWatch;
  });
}

export type { RouteHandler };
