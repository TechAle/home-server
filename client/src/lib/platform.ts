import {Platform} from 'react-native';

/** Public deployment behind Caddy (DuckDNS). */
export const REMOTE_BASE_URL = 'https://raspale.duckdns.org';

/**
 * `127.0.0.1` on a phone is the phone itself: Android emulators reach the host
 * through 10.0.2.2. The login/register screens toggle between this local server
 * and the remote DuckDNS one.
 */
export function defaultBaseUrl(): string {
  return Platform.OS === 'android'
    ? 'http://10.0.2.2:5000'
    : 'http://127.0.0.1:5000';
}
