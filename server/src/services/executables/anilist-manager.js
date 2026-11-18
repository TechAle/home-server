/**
 * AnilistManager — port of `services/executables/AnilistManager.py`.
 *
 * This file is only the service adapter the loader discovers: it owns the
 * configuration and the `/get_anime` route. The moving parts live outside
 * `executables/` so the loader never instantiates them:
 *
 *   ../anilist/client.js       AniList GraphQL client (viewer + watching list)
 *   ../anilist/links.js        AniSaturn search, title matching, episode link
 *   ../anilist/next-episode.js next-airing schedule (empty link while waiting)
 *   ../anilist/queries.js      GraphQL documents
 *
 * Output shape:
 *   { [animeTitle]: { progress: number, link: string[], nextEpisode: object | null } }
 */
import { route } from "../../rules.js";
import { createAniListClient } from "../anilist/client.js";
import { nextEpisodeLink } from "../anilist/links.js";
import { nextEpisodeState } from "../anilist/next-episode.js";

export default class AnilistManager {
  #client = null;

  constructor(configurationPath = "configuration.json") {
    this.configurationPath = configurationPath;
    this.api = "https://graphql.anilist.co";
    this.clientId = "";
    this.clientSecret = "";
    this.redirectUri = "";
    this.accessToken = "";
  }

  /** Called by the loader once the configuration is available. */
  configure(anilist) {
    Object.assign(this, anilist);
    // Rebuild lazily with the new token/API on the next request.
    this.#client = null;
    return this;
  }

  get client() {
    this.#client ??= createAniListClient({ api: this.api, accessToken: this.accessToken });
    return this.#client;
  }

  getAnime = route("/get_anime", ["GET"])(async () => {
    const watching = await this.client.watchingAnime();

    // Titles waiting for the next episode stay in the output: `link` is empty
    // and `nextEpisode` carries the schedule.
    const entries = watching
      .filter((entry) => Boolean(entry.media.title.english || entry.media.title.romaji))
      .map((entry) => ({
        entry,
        title: entry.media.title.english || entry.media.title.romaji,
        ...nextEpisodeState(entry.media, entry.progress),
      }));

    const links = await Promise.all(
      entries.map(async ({ entry, title, waiting }) => {
        if (waiting) return [];
        try {
          return await nextEpisodeLink(title, entry.progress, entry.media.startDate?.year);
        } catch (error) {
          console.warn(`[anilist] ${title}: ${error?.message ?? error}`);
          return [];
        }
      }),
    );

    /** @type {Record<string, { progress: number, link: string[], nextEpisode: object | null }>} */
    const toWatch = {};
    entries.forEach(({ entry, title, nextEpisode }, index) => {
      toWatch[title] = { progress: entry.progress, link: links[index], nextEpisode };
    });

    return toWatch;
  });
}
