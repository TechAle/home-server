export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  computer: {
    info: ['computer', 'info'] as const,
    resources: ['computer', 'resources'] as const,
  },
  anilist: {
    toWatch: ['anilist', 'to-watch'] as const,
    download: (id: string) => ['anilist', 'download', id] as const,
    downloads: (title: string) => ['anilist', 'downloads', title] as const,
    downloadsAll: ['anilist', 'downloads-all'] as const,
  },
  foundry: {
    status: ['foundry', 'status'] as const,
  },
};
