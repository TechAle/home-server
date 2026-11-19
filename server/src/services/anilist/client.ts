/**
 * createAniListClient — small AniList GraphQL client.
 *
 * The loader instantiates services with no arguments, so this is a factory the
 * service calls lazily; `fetchImpl` can be injected in tests.
 */
import { CURRENT_USER_QUERY, WATCHING_QUERY } from "./queries.js";

export interface AniListTitle {
  english?: string | null;
  romaji?: string | null;
}

export interface AniListMedia {
  title: AniListTitle;
  startDate?: { year?: number | null } | null;
  nextAiringEpisode?: { airingAt?: number | null; episode?: number | null } | null;
}

export interface AniListEntry {
  progress: number;
  score?: number | null;
  media: AniListMedia;
}

export interface AniListResponse<T> {
  data: T;
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
  executeQuery<T>(query: string, variables?: Record<string, unknown>): Promise<AniListResponse<T>>;
  currentUserId(): Promise<number>;
  watchingAnime(): Promise<AniListEntry[]>;
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
    });

    if (!response.ok) {
      throw new Error(`GraphQL query failed with status ${response.status}`);
    }

    return (await response.json()) as AniListResponse<T>;
  }

  async function currentUserId(): Promise<number> {
    if (viewerId != null) return viewerId;
    const response = await executeQuery<ViewerData>(CURRENT_USER_QUERY);
    viewerId = response.data.Viewer.id;
    return viewerId;
  }

  async function watchingAnime(): Promise<AniListEntry[]> {
    const userId = await currentUserId();
    const response = await executeQuery<WatchingData>(WATCHING_QUERY, {
      type: "ANIME",
      status: "CURRENT",
      userId,
    });
    return response.data.MediaListCollection.lists[0]?.entries ?? [];
  }

  return { executeQuery, currentUserId, watchingAnime };
}
