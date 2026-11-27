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
            id
            title { english romaji }
            startDate { year }
            episodes
            nextAiringEpisode { airingAt episode }
          }
          status
          progress
        }
      }
    }
  }
`;

/** Mark one more episode as watched on the user's list. */
export const SAVE_PROGRESS_MUTATION = `
  mutation SaveProgress($mediaId: Int, $progress: Int) {
    SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: CURRENT) {
      id
      progress
    }
  }
`;
