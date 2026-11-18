/**
 * createAniListClient — small AniList GraphQL client.
 *
 * The loader instantiates services with no arguments, so this is a factory
 * the service calls lazily; `fetchImpl` can be injected in tests.
 */
import { CURRENT_USER_QUERY, WATCHING_QUERY } from "./queries.js";

export function createAniListClient({
  api = "https://graphql.anilist.co",
  accessToken = "",
  fetchImpl = (...args) => globalThis.fetch(...args),
} = {}) {
  let viewerId = null;

  async function executeQuery(query, variables = {}) {
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

    return response.json();
  }

  async function currentUserId() {
    if (viewerId != null) return viewerId;
    const response = await executeQuery(CURRENT_USER_QUERY);
    viewerId = response.data.Viewer.id;
    return viewerId;
  }

  async function watchingAnime() {
    const userId = await currentUserId();
    const response = await executeQuery(WATCHING_QUERY, {
      type: "ANIME",
      status: "CURRENT",
      userId,
    });
    return response.data.MediaListCollection.lists[0]?.entries ?? [];
  }

  return { executeQuery, currentUserId, watchingAnime };
}
