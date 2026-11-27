import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {fetchFoundryStatus, restartFoundry, startFoundry} from '../api/foundry';
import {queryKeys} from './keys';

/** Foundry can go up or down outside the app, so poll instead of caching. */
export function useFoundryStatus() {
  return useQuery({
    queryKey: queryKeys.foundry.status,
    queryFn: fetchFoundryStatus,
    refetchInterval: 10_000,
  });
}

function useFoundryAction(run: () => Promise<unknown>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: run,
    onSuccess: () =>
      queryClient.invalidateQueries({queryKey: queryKeys.foundry.status}),
  });
}

export function useStartFoundry() {
  return useFoundryAction(startFoundry);
}

export function useRestartFoundry() {
  return useFoundryAction(restartFoundry);
}
