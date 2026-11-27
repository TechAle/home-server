import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';

interface AuthState {
  /** The API key returned by the server after login. */
  token: string | null;
  username: string | null;
  setSession: (session: {token: string; username: string}) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      token: null,
      username: null,
      setSession: ({token, username}) => set({token, username}),
      clearSession: () => set({token: null, username: null}),
    }),
    {
      name: 'home-server:auth',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn(
            '[auth] could not read the stored session; is AsyncStorage linked?',
            error,
          );
        }
      },
    },
  ),
);
