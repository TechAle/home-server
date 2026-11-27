export type PublicRoute = 'login' | 'register';

export type MainRoute =
  | 'dashboard'
  | 'raspberry'
  | 'anilist'
  | 'files'
  | 'media'
  | 'backup';

export interface MainNavItem {
  id: MainRoute;
  label: string;
}

export const MAIN_NAV: MainNavItem[] = [
  {id: 'dashboard', label: 'Dashboard'},
  {id: 'raspberry', label: 'Raspberry Pi'},
  {id: 'anilist', label: 'AniList'},
  {id: 'files', label: 'File Server'},
  {id: 'media', label: 'Media'},
  {id: 'backup', label: 'Backup'},
];
