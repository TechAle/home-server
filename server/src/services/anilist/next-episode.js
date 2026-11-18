/**
 * Whether the next episode is still airing, plus its schedule. When it is,
 * the title stays in the output with an empty `link` and a `nextEpisode` field
 * the UI can show until the episode is out.
 */
export function nextEpisodeState(media, progress) {
  const next = media?.nextAiringEpisode;
  if (!next) return { waiting: false, nextEpisode: null };

  const episode = Number(next.episode);
  const airingAt = Number(next.airingAt);
  const hasEpisode = Number.isFinite(episode) && episode > 0;
  const hasAiringAt = Number.isFinite(airingAt) && airingAt > 0;

  return {
    waiting: hasEpisode && episode <= Number(progress ?? 0) + 1,
    nextEpisode: {
      episode: hasEpisode ? episode : null,
      airingAt: hasAiringAt ? airingAt : null,
      airingAtIso: hasAiringAt ? new Date(airingAt * 1000).toISOString() : null,
    },
  };
}
