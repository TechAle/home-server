import { test } from "node:test";
import assert from "node:assert/strict";
import { createAniListClient } from "../src/services/anilist/client.js";

test("saveProgress sends the SaveMediaListEntry mutation", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  const fetchImpl = (async (url: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(url);
    capturedInit = init;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: { SaveMediaListEntry: { id: 1, progress: 7 } },
      }),
    };
  }) as unknown as typeof fetch;

  const client = createAniListClient({ accessToken: "test-token", fetchImpl });
  await client.saveProgress(42, 7);

  assert.equal(capturedUrl, "https://graphql.anilist.co");
  const body = JSON.parse(String(capturedInit?.body)) as {
    query: string;
    variables: Record<string, unknown>;
  };
  assert.match(body.query, /SaveMediaListEntry/);
  assert.match(body.query, /status:\s*CURRENT/);
  assert.deepEqual(body.variables, { mediaId: 42, progress: 7 });
});

function fakeEntry(id: number, status: string, progress: number) {
  return {
    status,
    progress,
    media: {
      id,
      title: { english: `Anime ${id}`, romaji: null },
      startDate: { year: 2024 },
      nextAiringEpisode: null,
    },
  };
}

test("trackedAnime merges CURRENT and PLANNING entries without duplicates", async () => {
  const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    const { query } = JSON.parse(String(init?.body)) as { query: string };
    const payload = query.includes("Viewer")
      ? { data: { Viewer: { id: 1 } } }
      : {
          data: {
            MediaListCollection: {
              lists: [
                {
                  entries: [
                    fakeEntry(1, "CURRENT", 3),
                    fakeEntry(2, "COMPLETED", 12),
                  ],
                },
                {
                  entries: [
                    fakeEntry(3, "PLANNING", 0),
                    // The same anime can also live in a custom list.
                    fakeEntry(1, "CURRENT", 3),
                    fakeEntry(4, "DROPPED", 2),
                  ],
                },
              ],
            },
          },
        };

    return { ok: true, status: 200, json: async () => payload };
  }) as unknown as typeof fetch;

  const client = createAniListClient({ accessToken: "test-token", fetchImpl });
  const entries = await client.trackedAnime();

  assert.deepEqual(
    entries.map((entry) => entry.media.id).sort((a, b) => a - b),
    [1, 3],
  );
});

test("saveProgress rejects when AniList does not return the entry", async () => {
  const fetchImpl = (async () => ({
    ok: true,
    status: 200,
    json: async () => ({ data: { SaveMediaListEntry: null } }),
  })) as unknown as typeof fetch;

  const client = createAniListClient({ accessToken: "test-token", fetchImpl });

  await assert.rejects(client.saveProgress(42, 7), /did not save/);
});
