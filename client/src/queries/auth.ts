import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import * as authApi from '../api/auth';
import {useAuthStore} from '../store/auth';
import {queryKeys} from './keys';

/** Validates the cached key before the app shows any data. */
export function useMe() {
  const token = useAuthStore(state => state.token);
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authApi.me,
    enabled: Boolean(token),
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const setSession = useAuthStore(state => state.setSession);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({username, password}: {username: string; password: string}) =>
      authApi.login(username, password),
    onSuccess: session => {
      setSession({token: session.token, username: session.user.username});
      // We already know the user: skip the /auth/me splash after login.
      queryClient.setQueryData(queryKeys.auth.me, {user: session.user});
    },
  });
}

export function useRegister() {
  const setSession = useAuthStore(state => state.setSession);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      username,
      password,
      registrationKey,
    }: {
      username: string;
      password: string;
      registrationKey: string;
    }) => authApi.register(username, password, registrationKey),
    onSuccess: session => {
      setSession({token: session.token, username: session.user.username});
      queryClient.setQueryData(queryKeys.auth.me, {user: session.user});
    },
  });
}

export function useLogout() {
  const clearSession = useAuthStore(state => state.clearSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout();
      } catch {
        // Revoking a key the server already rejected is not an error.
      }
    },
    onSettled: () => {
      clearSession();
      queryClient.clear();
    },
  });
}
