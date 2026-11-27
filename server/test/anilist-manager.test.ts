import { test } from "node:test";
import assert from "node:assert/strict";
import AnilistManager, { type ToWatch } from "../src/services/executables/anilist-manager.js";

test("getAnime keeps airing titles with link [] and a nextEpisode schedule", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });

  const airingAt = 1795000000;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const href = String(input);

    if (href.includes("graphql.anilist.co")) {
      const { query } = JSON.parse(String(init?.body)) as { query: string };
      if (query.includes("Viewer")) {
        return { ok: true, status: 200, json: async () => ({ data: { Viewer: { id: 1 } } }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            MediaListCollection: {
              lists: [
                {
                  entries: [
                    {
                      progress: 6,
                      media: {
                        id: 101,
                        title: { english: "The World's Strongest Witch", romaji: "Sekai Saikyou no Majo" },
                        startDate: { year: 2026 },
                        nextAiringEpisode: { episode: 7, airingAt },
                      },
                    },
                    {
                      progress: 0,
                      media: {
                        id: 202,
                        title: { english: "Frieren: Beyond Journey's End", romaji: "Sousou no Frieren" },
                        startDate: { year: 2023 },
                        nextAiringEpisode: null,
                      },
                    },
                  ],
                },
              ],
            },
          },
        }),
      };
    }

    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          results: [{ title: "Frieren: Beyond Journey's End", year: "2023", url: "/anime/frieren-QEd4Q" }],
        }),
    };
  }) as unknown as typeof fetch;

  const manager = new AnilistManager();
  manager.configure({ accessToken: "test-token" });
  const toWatch = await (manager.getAnime as unknown as () => Promise<ToWatch>)();

  assert.deepEqual(Object.keys(toWatch).sort(), [
    "Frieren: Beyond Journey's End",
    "The World's Strongest Witch",
  ]);
  assert.deepEqual(toWatch["The World's Strongest Witch"], {
    mediaId: 101,
    progress: 6,
    link: [],
    nextEpisode: { episode: 7, airingAt, airingAtIso: new Date(airingAt * 1000).toISOString() },
  });
  assert.deepEqual(toWatch["Frieren: Beyond Journey's End"], {
    mediaId: 202,
    progress: 0,
    link: ["https://www.animesaturn.net/anime/frieren-QEd4Q/ep-1"],
    nextEpisode: null,
  });
});

test("getAnime answers 503 without a token", async () => {
  const manager = new AnilistManager();
  manager.configure({ accessToken: "" });

  await assert.rejects(
    (manager.getAnime as unknown as () => Promise<unknown>)(),
    (error: { status?: number }) => error.status === 503,
  );
});
