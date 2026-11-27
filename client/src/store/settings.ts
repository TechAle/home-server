import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import {defaultBaseUrl, REMOTE_BASE_URL} from '../lib/platform';

export type ThemeMode = 'light' | 'dark';
export type ServerMode = 'local' | 'remote';

interface SettingsState {
  baseUrl: string;
  /** Which server the auth screens point at. */
  serverMode: ServerMode;
  theme: ThemeMode;
  /** How often the dashboard refreshes the Raspberry metrics. */
  pollingInterval: number;
  setBaseUrl: (baseUrl: string) => void;
  setServerMode: (mode: ServerMode) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) {return defaultBaseUrl();}
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    set => ({
      baseUrl: defaultBaseUrl(),
      serverMode: 'local',
      theme: 'light',
      pollingInterval: 5000,
      setBaseUrl: baseUrl => set({baseUrl: normalizeBaseUrl(baseUrl)}),
      setServerMode: mode =>
        set({
          serverMode: mode,
          baseUrl:
            mode === 'remote' ? REMOTE_BASE_URL : defaultBaseUrl(),
        }),
      setTheme: theme => set({theme}),
      toggleTheme: () =>
        set(state => ({theme: state.theme === 'light' ? 'dark' : 'light'})),
    }),
    {
      name: 'home-server:settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // Settings saved before serverMode existed: infer it from the URL.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SettingsState>;
        const baseUrl = saved.baseUrl ?? current.baseUrl;
        return {
          ...current,
          ...saved,
          serverMode:
            saved.serverMode ??
            (baseUrl.includes('duckdns.org') ? 'remote' : 'local'),
        };
      },
    },
  ),
);
