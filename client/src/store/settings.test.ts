import {defaultBaseUrl, REMOTE_BASE_URL} from '../lib/platform';
import {useSettingsStore} from './settings';

afterEach(() => {
  useSettingsStore.getState().setServerMode('local');
});

test('setServerMode points the API at the remote DuckDNS server', () => {
  useSettingsStore.getState().setServerMode('remote');

  const state = useSettingsStore.getState();
  expect(state.serverMode).toBe('remote');
  expect(state.baseUrl).toBe(REMOTE_BASE_URL);
  expect(state.baseUrl.startsWith('https://')).toBe(true);
});

test('setServerMode returns to the platform local address', () => {
  useSettingsStore.getState().setServerMode('remote');
  useSettingsStore.getState().setServerMode('local');

  const state = useSettingsStore.getState();
  expect(state.serverMode).toBe('local');
  expect(state.baseUrl).toBe(defaultBaseUrl());
});
