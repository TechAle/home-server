/**
 * createAniListClient — small AniList GraphQL client.
 *
 * The loader instantiates services with no arguments, so this is a factory the
 * service calls lazily; `fetchImpl` can be injected in tests.
 */
import { CURRENT_USER_QUERY, SAVE_PROGRESS_MUTATION, WATCHING_QUERY } from "./queries.js";

export interface AniListTitle {
  english?: string | null;
  romaji?: string | null;
}

export interface AniListMedia {
  id: number;
  title: AniListTitle;
  startDate?: { year?: number | null } | null;
  episodes?: number | null;
  nextAiringEpisode?: { airingAt?: number | null; episode?: number | null } | null;
}

export interface AniListEntry {
  status: string;
  progress: number;
  score?: number | null;
  media: AniListMedia;
}

export interface AniListResponse<T> {
  data: T;
  errors?: Array<{ message?: string; status?: number }>;
}

interface ViewerData {
  Viewer: { id: number };
}

interface WatchingData {
  MediaListCollection: {
    lists: Array<{ entries: AniListEntry[] }>;
  };
}

export interface AniListClient {
  /** Anime the user is watching or plans to watch. */
  trackedAnime(): Promise<AniListEntry[]>;
  saveProgress(mediaId: number, progress: number): Promise<void>;
}

export interface AniListClientOptions {
  api?: string;
  accessToken?: string;
  fetchImpl?: typeof fetch;
}

export function createAniListClient({
  api = "https://graphql.anilist.co",
  accessToken = "",
  fetchImpl = globalThis.fetch,
}: AniListClientOptions = {}): AniListClient {
  let viewerId: number | null = null;

  async function executeQuery<T>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<AniListResponse<T>> {
    if (!accessToken) {
      throw Object.assign(new Error("AniList token missing: set ANILIST_ACCESS_TOKEN in server/.env"), {
        status: 503,
      });
    }

    const response = await fetchImpl(api, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
      // A stalled AniList request must not wedge /get_anime forever.
      signal: AbortSignal.timeout(10_000),
    });

    const body = (await response.json().catch(() => null)) as AniListResponse<T> | null;

    if (!response.ok) {
      const message =
        body?.errors?.[0]?.message ?? `GraphQL query failed with status ${response.status}`;
      const status =
        response.status === 401 || response.status === 403
          ? 503
          : response.status === 429
            ? 429
            : 502;
      throw Object.assign(new Error(`AniList: ${message}`), { status });
    }

    if (body?.errors?.length) {
      const first = body.errors[0];
      const status = first.status === 401 || first.status === 403
        ? 503
        : first.status === 429
          ? 429
          : 502;
      throw Object.assign(
        new Error(`AniList: ${first.message ?? "request failed"}`),
        { status },
      );
    }

    if (!body?.data) {
      throw Object.assign(new Error("AniList returned an empty response."), { status: 502 });
    }

    return body;
  }

  async function currentUserId(): Promise<number> {
    if (viewerId != null) return viewerId;
    const response = await executeQuery<ViewerData>(CURRENT_USER_QUERY);
    viewerId = response.data.Viewer.id;
    return viewerId;
  }

  async function trackedAnime(): Promise<AniListEntry[]> {
    const userId = await currentUserId();
    // No status filter: one request returns every list, including custom ones.
    const response = await executeQuery<WatchingData>(WATCHING_QUERY, {
      type: "ANIME",
      userId,
    });

    // An entry can appear in both its status list and a custom list.
    const byMedia = new Map<number, AniListEntry>();
    for (const list of response.data.MediaListCollection.lists) {
      for (const entry of list.entries) {
        if (entry.status !== "CURRENT" && entry.status !== "PLANNING") continue;
        if (!byMedia.has(entry.media.id)) byMedia.set(entry.media.id, entry);
      }
    }
    return [...byMedia.values()];
  }

  async function saveProgress(mediaId: number, progress: number): Promise<void> {
    const response = await executeQuery<{
      SaveMediaListEntry: { id: number; progress: number } | null;
    }>(SAVE_PROGRESS_MUTATION, { mediaId, progress });

    if (!response.data?.SaveMediaListEntry) {
      throw new Error("AniList did not save the progress.");
    }
  }

  return { trackedAnime, saveProgress };
}
