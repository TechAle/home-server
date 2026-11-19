import { test } from "node:test";
import assert from "node:assert/strict";
import { nextEpisodeState } from "../src/services/anilist/next-episode.js";

test("waiting when progress is at the last aired episode", () => {
  const media = { nextAiringEpisode: { episode: 7, airingAt: 1795000000 } };

  assert.deepEqual(nextEpisodeState(media, 6), {
    waiting: true,
    nextEpisode: {
      episode: 7,
      airingAt: 1795000000,
      airingAtIso: new Date(1795000000 * 1000).toISOString(),
    },
  });
  assert.equal(nextEpisodeState(media, 5).waiting, false);
});

test("no schedule means no waiting and no nextEpisode", () => {
  assert.deepEqual(nextEpisodeState({ nextAiringEpisode: null }, 0), { waiting: false, nextEpisode: null });
  assert.equal(nextEpisodeState({}, 0).nextEpisode, null);
});
