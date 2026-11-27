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

export function startAnimeDownload(input: {
  url: string;
  title: string;
  episode: number;
  mediaId: number;
  episodeBase: string;
  status: string;
  animeProgress: number;
}): Promise<AnimeDownload> {
  return request<AnimeDownload>('/anime/download', {
    method: 'POST',
    body: input,
  }).then(withAbsolutePlayUrl);
}

export async function fetchAnimeDownload(id: string): Promise<AnimeDownload> {
  const job = await request<AnimeDownload>(`/anime/download/${encodeURIComponent(id)}`);
  return withAbsolutePlayUrl(job);
}

export async function fetchAnimeDownloads(title: string): Promise<AnimeDownload[]> {
  const jobs = await request<AnimeDownload[]>(
    `/anime/downloads?title=${encodeURIComponent(title)}`,
  );
  return jobs.map(withAbsolutePlayUrl);
}

/** The completed library across every anime. */
export async function fetchAllAnimeDownloads(): Promise<AnimeDownload[]> {
  const jobs = await request<AnimeDownload[]>('/anime/downloads');
  return jobs.map(withAbsolutePlayUrl);
}

export function deleteAnimeDownload(id: string): Promise<{ok: boolean}> {
  return request<{ok: boolean}>(`/anime/download/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function markAnimeRewatch(
  mediaId: number,
  progress: number,
): Promise<{mediaId: number; progress: number; status: string}> {
  return request('/anime/rewatch', {
    method: 'POST',
    body: {mediaId, progress},
  });
}

export interface MarkWatchedResult {
  mediaId: number;
  progress: number;
  status: string;
}

/** Mark the given progress on the user's AniList entry. */
export function markAnimeWatched(
  mediaId: number,
  progress: number,
  status: 'CURRENT' | 'REPEATING' = 'CURRENT',
): Promise<MarkWatchedResult> {
  return request<MarkWatchedResult>('/anime/watched', {
    method: 'POST',
    body: {mediaId, progress, status},
  });
}
