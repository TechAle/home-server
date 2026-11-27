import {useQuery} from '@tanstack/react-query';
import {
  fetchComputerInfo,
  fetchSystemResources,
} from '../api/computer';
import {useSettingsStore} from '../store/settings';
import {queryKeys} from './keys';

export function useComputerInfo() {
  return useQuery({
    queryKey: queryKeys.computer.info,
    queryFn: fetchComputerInfo,
    staleTime: 60_000,
  });
}

/** Live metrics: polled at the user's interval, paused when unfocused. */
export function useSystemResources() {
  const pollingInterval = useSettingsStore(state => state.pollingInterval);
  return useQuery({
    queryKey: queryKeys.computer.resources,
    queryFn: fetchSystemResources,
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: false,
    staleTime: 1_000,
    retry: 1,
  });
}
