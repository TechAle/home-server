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
