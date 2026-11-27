import type {ToWatch} from '../types/api';
import {request} from './client';

export function fetchAnimeLinks(): Promise<ToWatch> {
  return request<ToWatch>('/get_anime');
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
