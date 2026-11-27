import {useEffect, useState} from 'react';
import {useAuthStore} from '../store/auth';

/**
 * The persisted key is read from AsyncStorage asynchronously. Waiting for the
 * rehydration avoids a flash of the login screen for a signed-in user.
 *
 * If storage is unavailable (e.g. the native module is not linked), Zustand
 * never reports the hydration as finished, so a timeout lets the app continue
 * instead of staying on the splash forever.
 */
const HYDRATION_TIMEOUT_MS = 2_000;

export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    useAuthStore.persist.hasHydrated(),
  );

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (timeoutId) {clearTimeout(timeoutId);}
      setHydrated(true);
    };

    const unsubscribe = useAuthStore.persist.onFinishHydration(finish);
    timeoutId = setTimeout(() => {
      console.warn(
        '[auth] session storage did not hydrate in time; continuing without it',
      );
      finish();
    }, HYDRATION_TIMEOUT_MS);

    return () => {
      if (timeoutId) {clearTimeout(timeoutId);}
      unsubscribe();
    };
  }, []);

  return hydrated;
}
