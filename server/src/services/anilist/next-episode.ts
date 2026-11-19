/**
 * Whether the next episode is still airing, plus its schedule. When it is, the
 * title stays in the output with an empty `link` and a `nextEpisode` field the
 * UI can show until the episode is out.
 */
export interface MediaSchedule {
  nextAiringEpisode?: { episode?: number | null; airingAt?: number | null } | null;
}

export interface NextEpisode {
  episode: number | null;
  airingAt: number | null;
  airingAtIso: string | null;
}

export interface NextEpisodeState {
  waiting: boolean;
  nextEpisode: NextEpisode | null;
}

export function nextEpisodeState(media: MediaSchedule | undefined, progress: number): NextEpisodeState {
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
