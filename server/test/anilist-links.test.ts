import { test } from "node:test";
import assert from "node:assert/strict";
import {
  animeIdFrom,
  anisaturnEpisodeUrl,
  createAnisaturnResolver,
  pickAnime,
  searchQueries,
} from "../src/services/anilist/links.js";

type Results = Array<{ title: string; year?: string; url: string }>;
type Routes = Record<string, Results>;

function fakeFetch(routes: Routes) {
  const calls: string[] = [];

  const impl = async (url: string) => {
    const decoded = decodeURIComponent(String(url));
    calls.push(decoded);
    const match = Object.entries(routes).find(([needle]) => decoded.endsWith(needle));
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ results: match?.[1] ?? [] }),
    };
  };

  return Object.assign(impl, { calls });
}

test("animeIdFrom extracts the id from an AniSaturn result", () => {
  assert.equal(animeIdFrom({ url: "/anime/jujutsu-kaisen-2rgk6" }), "jujutsu-kaisen-2rgk6");
  assert.equal(animeIdFrom({ url: "/filter?key=x" }), "");
  assert.equal(animeIdFrom(undefined), "");
});

test("anisaturnEpisodeUrl appends the episode number", () => {
  assert.equal(
    anisaturnEpisodeUrl("jujutsu-kaisen-2rgk6", 5),
    "https://www.animesaturn.net/anime/jujutsu-kaisen-2rgk6/ep-5",
  );
});

test("searchQueries shortens Season/Part and subtitle titles", () => {
  assert.deepEqual(searchQueries("That Time I Got Reincarnated as a Slime Season 4"), [
    "That Time I Got Reincarnated as a Slime Season 4",
    "That Time I Got Reincarnated as a Slime 4",
  ]);
  assert.deepEqual(searchQueries("Ascendance of a Bookworm: Adopted Daughter of an Archduke"), [
    "Ascendance of a Bookworm: Adopted Daughter of an Archduke",
    "Ascendance of a Bookworm",
  ]);
  assert.deepEqual(searchQueries("Naruto"), ["Naruto"]);
});

test("pickAnime uses the release year to tell seasons apart", () => {
  const results = [
    { title: "Ascendance of a Bookworm", year: "2019", url: "/anime/bookworm-1" },
    { title: "Ascendance of a Bookworm 2", year: "2020", url: "/anime/bookworm-2" },
    { title: "Ascendance of a Bookworm 4", year: "2026", url: "/anime/bookworm-4" },
  ];

  assert.equal(pickAnime(results, "Ascendance of a Bookworm", 2026).url, "/anime/bookworm-4");
  assert.equal(pickAnime(results, "Ascendance of a Bookworm", 2019).url, "/anime/bookworm-1");
  assert.equal(pickAnime(results, "Ascendance of a Bookworm").url, "/anime/bookworm-1");
  assert.equal(pickAnime([], "Naruto"), null);
});

test("episodeLink retries without the Season word", async () => {
  const fetchImpl = fakeFetch({
    "Slime 4": [
      { title: "That Time I Got Reincarnated as a Slime 4", year: "2026", url: "/anime/slime-4-ySAuE" },
    ],
  });
  const resolver = createAnisaturnResolver({ fetchImpl, spacingMs: 0 });

  assert.deepEqual(
    await resolver.episodeLink("That Time I Got Reincarnated as a Slime Season 4", 0, 2026),
    ["https://www.animesaturn.net/anime/slime-4-ySAuE/ep-1"],
  );
  assert.equal(fetchImpl.calls.length, 2);
});

test("episodeLink finds a subtitle season through the main title + year", async () => {
  const fetchImpl = fakeFetch({
    "q=Ascendance of a Bookworm": [
      { title: "Ascendance of a Bookworm", year: "2019", url: "/anime/bookworm-1" },
      { title: "Ascendance of a Bookworm 4", year: "2026", url: "/anime/bookworm-4" },
    ],
  });
  const resolver = createAnisaturnResolver({ fetchImpl, spacingMs: 0 });

  assert.deepEqual(
    await resolver.episodeLink("Ascendance of a Bookworm: Adopted Daughter of an Archduke", 0, 2026),
    ["https://www.animesaturn.net/anime/bookworm-4/ep-1"],
  );
});

test("episodeLink caches answers and returns [] when nothing matches", async () => {
  const fetchImpl = fakeFetch({});
  const resolver = createAnisaturnResolver({ fetchImpl, spacingMs: 0 });

  assert.deepEqual(await resolver.episodeLink("Bleach", 0), []);
  assert.deepEqual(await resolver.episodeLink("Bleach", 0), []);
  // One query, cached: "Bleach" has no colon or season, so it yields one query.
  assert.equal(fetchImpl.calls.length, 1);
});

test("episodeLink surfaces HTTP failures for the service to swallow", async () => {
  const resolver = createAnisaturnResolver({
    spacingMs: 0,
    fetchImpl: async () => ({ ok: false, status: 503, text: async () => "" }),
  });

  await assert.rejects(
    resolver.episodeLink("Bleach", 0),
    (error: { status?: number }) => error.status === 502,
  );
});
