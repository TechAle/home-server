import {useQuery} from '@tanstack/react-query';
import {fetchAnimeLinks} from '../api/anilist';
import {queryKeys} from './keys';

/** The server caches AniSaturn for six hours; keep the client copy fresh too. */
export function useAnimeLinks() {
  return useQuery({
    queryKey: queryKeys.anilist.toWatch,
    queryFn: fetchAnimeLinks,
    staleTime: 5 * 60_000,
  });
}
