import {ApiError} from '../lib/errors';
import {useAuthStore} from '../store/auth';
import {useSettingsStore} from '../store/settings';

const TIMEOUT_MS = 15_000;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

/**
 * The only place that talks HTTP. Base URL and API key come from the stores, so
 * every endpoint module stays free of configuration.
 */
export async function request<T>(
  path: string,
  {method = 'GET', body, auth = true}: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {Accept: 'application/json'};
  if (body !== undefined) {headers['Content-Type'] = 'application/json';}
  if (auth && token) {headers.Authorization = `Bearer ${token}`;}

  let response: Response;
  try {
    response = await fetch(`${useSettingsStore.getState().baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as Error | null)?.name === 'AbortError') {
      throw new ApiError(0, 'Il server non ha risposto in tempo.');
    }
    throw new ApiError(
      0,
      'Server non raggiungibile. Controlla la connessione e l’indirizzo.',
    );
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 && auth && token) {
    // Expired or revoked key: drop it so the navigator sends the user back.
    useAuthStore.getState().clearSession();
  }

  if (response.status === 204) {return undefined as T;}

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message = (payload as {error?: unknown} | null)?.error;
    throw new ApiError(
      response.status,
      typeof message === 'string'
        ? message
        : `Richiesta fallita (${response.status}).`,
    );
  }

  return payload as T;
}
