import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  deleteAnimeDownload,
  fetchAllAnimeDownloads,
  fetchAnimeDownload,
  fetchAnimeDownloads,
  fetchAnimeLinks,
  markAnimeRewatch,
  markAnimeWatched,
  startAnimeDownload,
} from '../api/anilist';
import {queryKeys} from './keys';

/** The server caches AniSaturn for six hours; keep the client copy fresh too. */
export function useAnimeLinks() {
  return useQuery({
    queryKey: queryKeys.anilist.toWatch,
    queryFn: fetchAnimeLinks,
    staleTime: 5 * 60_000,
  });
}

/** Persist the watched progress on AniList and refresh the list. */
export function useMarkWatched() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      mediaId,
      progress,
      status,
    }: {
      mediaId: number;
      progress: number;
      status?: 'CURRENT' | 'REPEATING';
    }) => markAnimeWatched(mediaId, progress, status),
    onSuccess: () =>
      queryClient.invalidateQueries({queryKey: queryKeys.anilist.toWatch}),
  });
}

/** Move an anime to AniList's REPEATING status from a given progress. */
export function useRewatchAnime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({mediaId, progress}: {mediaId: number; progress: number}) =>
      markAnimeRewatch(mediaId, progress),
    onSuccess: () =>
      queryClient.invalidateQueries({queryKey: queryKeys.anilist.toWatch}),
  });
}

/** Start a server-side download; the returned job is polled separately. */
export function useStartAnimeDownload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startAnimeDownload,
    onSuccess: (_job, input) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.anilist.downloads(input.title),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.anilist.downloadsAll,
      });
    },
  });
}

export function useAnimeDownload(id: string | null) {
  return useQuery({
    queryKey: queryKeys.anilist.download(id ?? ''),
    queryFn: () => fetchAnimeDownload(id as string),
    enabled: Boolean(id),
    refetchInterval: query =>
      query.state.data?.status === 'downloading' ? 1000 : false,
  });
}

/** Poll the episode list while at least one download is running. */
export function useAnimeDownloads(title: string) {
  return useQuery({
    queryKey: queryKeys.anilist.downloads(title),
    queryFn: () => fetchAnimeDownloads(title),
    enabled: Boolean(title),
    refetchInterval: query =>
      (query.state.data ?? []).some(job => job.status === 'downloading')
        ? 1500
        : false,
  });
}

/** All completed downloads, used by the "Tutti" library view. */
export function useAllAnimeDownloads(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.anilist.downloadsAll,
    queryFn: fetchAllAnimeDownloads,
    enabled,
    staleTime: 0,
  });
}

export function useDeleteAnimeDownload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAnimeDownload,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['anilist', 'downloads']});
      queryClient.invalidateQueries({queryKey: queryKeys.anilist.downloadsAll});
    },
  });
}
