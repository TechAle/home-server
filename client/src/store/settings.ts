import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import {defaultBaseUrl} from '../lib/platform';

export type ThemeMode = 'light' | 'dark';

interface SettingsState {
  baseUrl: string;
  theme: ThemeMode;
  /** How often the dashboard refreshes the Raspberry metrics. */
  pollingInterval: number;
  setBaseUrl: (baseUrl: string) => void;
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
      theme: 'light',
      pollingInterval: 5000,
      setBaseUrl: baseUrl => set({baseUrl: normalizeBaseUrl(baseUrl)}),
      setTheme: theme => set({theme}),
      toggleTheme: () =>
        set(state => ({theme: state.theme === 'light' ? 'dark' : 'light'})),
    }),
    {
      name: 'home-server:settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
