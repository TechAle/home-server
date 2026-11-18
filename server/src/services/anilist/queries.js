/**
 * AniList GraphQL documents used by AnilistManager.
 */

export const CURRENT_USER_QUERY = `
  query {
    Viewer { id }
  }
`;

export const WATCHING_QUERY = `
  query MediaListCollection($type: MediaType, $status: MediaListStatus, $userId: Int) {
    MediaListCollection(type: $type, status: $status, userId: $userId) {
      lists {
        entries {
          media {
            title { english romaji }
            startDate { year }
            nextAiringEpisode { airingAt episode }
          }
          progress
          score
        }
      }
    }
  }
`;
