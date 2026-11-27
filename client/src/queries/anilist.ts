import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  fetchAnimeDownload,
  fetchAnimeLinks,
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
    mutationFn: ({mediaId, progress}: {mediaId: number; progress: number}) =>
      markAnimeWatched(mediaId, progress),
    onSuccess: () =>
      queryClient.invalidateQueries({queryKey: queryKeys.anilist.toWatch}),
  });
}

/** Start a server-side download; the returned job is polled separately. */
export function useStartAnimeDownload() {
  return useMutation({mutationFn: startAnimeDownload});
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
