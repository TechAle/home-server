import {useEffect, useState} from 'react';

/**
 * Re-render every `intervalMs` so relative labels such as "2 min fa" stay
 * correct. Ten seconds is enough for the "Aggiornato" indicators.
 */
export function useNow(intervalMs = 10_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
