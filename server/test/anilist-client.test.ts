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
  assert.deepEqual(body.variables, { mediaId: 42, progress: 7 });
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
