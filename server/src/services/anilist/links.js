/**
 * AniSaturn link resolution.
 *
 * AniSaturn names later seasons with a plain number ("... Slime 4") or with a
 * subtitle ("Ascendance of a Bookworm: Adopted Daughter of an Archduke"), so
 * the exact AniList title often has no result. The search tries the full
 * title, then "Season 4" -> "4", then the main title before ":", and uses the
 * AniList release year to tell seasons apart.
 */
const ANISATURN_URL = "https://www.animesaturn.net";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36";

/** AniSaturn answers "Too many requests" when hit in bursts. */
const REQUEST_SPACING_MS = 300;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/** Lowercase, strip punctuation: "Re:Zero 2" -> "re zero 2". */
export function normalizeTitle(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** "/anime/jujutsu-kaisen-2rgk6" -> "jujutsu-kaisen-2rgk6". */
export function animeIdFrom(result) {
  const match = /^\/anime\/([^/?#]+)/.exec(result?.url ?? "");
  return match ? match[1] : "";
}

/** `https://www.animesaturn.net/anime/{id}/ep-{episode}`. */
export function anisaturnEpisodeUrl(animeId, episode) {
  return `${ANISATURN_URL}/anime/${animeId}/ep-${episode}`;
}

/**
 * Search queries to try, in order and without duplicates: the full title,
 * the title with the season word removed ("... Season 4" -> "... 4"), and the
 * main title before the first colon.
 */
export function searchQueries(title) {
  const queries = [];
  const add = (value) => {
    const text = String(value ?? "").trim();
    const key = normalizeTitle(text);
    if (key && !queries.some((item) => normalizeTitle(item) === key)) queries.push(text);
  };

  add(title);
  add(
    String(title ?? "")
      .replace(/\b(?:Season|Cour|Cours|Part)\s+(\d+)/gi, "$1")
      .replace(/\b(\d+)(?:st|nd|rd|th)\s+Season\b/gi, "$1"),
  );
  add(String(title ?? "").split(":")[0]);

  return queries;
}

function hasYear(result, year) {
  const value = Number(result?.year);
  return Number.isFinite(value) && value > 0 && Math.abs(value - year) <= 1;
}

/**
 * Best match among `results` for `query`.
 *
 * - an exact title match wins, preferring the one released in `year`;
 * - otherwise, when `year` is known, the first result that shares the query's
 *   first words and was released that year (how "Ascendance of a Bookworm"
 *   finds "... 4");
 * - otherwise the first exact match, then the first result.
 */
export function pickAnime(results, query, year) {
  const list = (Array.isArray(results) ? results : []).filter(
    (item) => typeof item?.url === "string" && item.url.startsWith("/anime/"),
  );
  if (list.length === 0) return null;

  const wanted = normalizeTitle(query);
  const words = wanted.split(" ").filter(Boolean).slice(0, 4).join(" ");
  const exact = list.filter((item) => normalizeTitle(item.title) === wanted);

  if (year) {
    const exactSameYear = exact.find((item) => hasYear(item, year));
    if (exactSameYear) return exactSameYear;

    const sameYear = list.find(
      (item) => words && normalizeTitle(item.title).startsWith(words) && hasYear(item, year),
    );
    if (sameYear) return sameYear;
  }

  return exact[0] ?? list[0];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolver with its own cache and request queue. One per service is enough;
 * tests can create an isolated one with an injected `fetchImpl`.
 */
export function createAnisaturnResolver({
  baseUrl = ANISATURN_URL,
  spacingMs = REQUEST_SPACING_MS,
  cacheTtlMs = CACHE_TTL_MS,
  fetchImpl = (...args) => globalThis.fetch(...args),
} = {}) {
  const cache = new Map();
  let lastRequestAt = 0;
  let queue = Promise.resolve();

  /** Serialise and space out requests; cache answers for a few hours. */
  async function search(query) {
    const key = normalizeTitle(query);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < cacheTtlMs) return cached.results;

    const run = async () => {
      const wait = spacingMs - (Date.now() - lastRequestAt);
      if (wait > 0) await sleep(wait);
      lastRequestAt = Date.now();

      const response = await fetchImpl(`${baseUrl}/api/search?q=${encodeURIComponent(query)}`, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      });
      if (!response.ok) {
        throw Object.assign(new Error(`AniSaturn search for "${query}" failed with status ${response.status}`), {
          status: 502,
        });
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw Object.assign(new Error(`AniSaturn search for "${query}" was rate-limited`), { status: 429 });
      }

      const results = Array.isArray(data?.results) ? data.results : [];
      if (cache.size >= 300) cache.delete(cache.keys().next().value);
      cache.set(key, { at: Date.now(), results });
      return results;
    };

    const result = queue.then(run, run);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  /**
   * Link of episode `progress + 1` for `title`, or `[]` when AniSaturn has no
   * matching anime. `year` is the AniList release year.
   */
  async function episodeLink(title, progress, year) {
    for (const query of searchQueries(title)) {
      const anime = pickAnime(await search(query), query, year);
      if (!anime) continue;

      const animeId = animeIdFrom(anime);
      if (!animeId) continue;

      return [anisaturnEpisodeUrl(animeId, Number(progress ?? 0) + 1)];
    }

    return [];
  }

  return { search, episodeLink };
}

let defaultResolver = null;

/** Convenience wrapper over a shared resolver. */
export function nextEpisodeLink(title, progress, year) {
  defaultResolver ??= createAnisaturnResolver();
  return defaultResolver.episodeLink(title, progress, year);
}
