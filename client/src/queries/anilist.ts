import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {fetchAnimeLinks, markAnimeWatched} from '../api/anilist';
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
