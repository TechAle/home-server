import type {AnimeDownload, ToWatch} from '../types/api';
import {useSettingsStore} from '../store/settings';
import {request} from './client';

function withAbsolutePlayUrl(job: AnimeDownload): AnimeDownload {
  if (!job.playUrl || /^https?:\/\//i.test(job.playUrl)) {
    return job;
  }
  return {...job, playUrl: `${useSettingsStore.getState().baseUrl}${job.playUrl}`};
}

export function fetchAnimeLinks(): Promise<ToWatch> {
  return request<ToWatch>('/get_anime');
}

export async function startAnimeDownload(input: {
  url: string;
  title: string;
  episode: number;
}): Promise<AnimeDownload> {
  const job = await request<AnimeDownload>('/anime/download', {
    method: 'POST',
    body: input,
  });
  return withAbsolutePlayUrl(job);
}

export async function fetchAnimeDownload(id: string): Promise<AnimeDownload> {
  const job = await request<AnimeDownload>(`/anime/download/${encodeURIComponent(id)}`);
  return withAbsolutePlayUrl(job);
}

export interface MarkWatchedResult {
  mediaId: number;
  progress: number;
}

/** Mark the given progress on the user's AniList entry. */
export function markAnimeWatched(
  mediaId: number,
  progress: number,
): Promise<MarkWatchedResult> {
  return request<MarkWatchedResult>('/anime/watched', {
    method: 'POST',
    body: {mediaId, progress},
  });
}
