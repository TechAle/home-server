import {Platform} from 'react-native';

/**
 * `127.0.0.1` on a phone is the phone itself: Android emulators reach the host
 * through 10.0.2.2. On a physical device the user edits this in the login form.
 */
export function defaultBaseUrl(): string {
  return Platform.OS === 'android'
    ? 'http://10.0.2.2:5000'
    : 'http://127.0.0.1:5000';
}
