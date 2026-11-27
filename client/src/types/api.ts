export interface AuthUser {
  id: number;
  username: string;
}

export interface AuthSession {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

export interface MeResponse {
  user: AuthUser;
}

export interface ComputerInfo {
  system: string;
  node_name: string;
  release: string;
  version: string;
  machine: string;
  processor: string;
  hostname: string;
  ip_address: string;
  external_ip: string | number;
}

export interface MemoryUsage {
  total_memory: number;
  used_memory: number;
  free_memory: number;
  memory_percent: number;
}

export interface DiskUsage {
  total_gib: number;
  used_gib: number;
  free_gib: number;
  percent_used: number;
}

export interface SystemResourceInfo {
  cpu_temperature: number;
  cpu_usage_percent: number;
  ram: {
    total_mib: number;
    used_mib: number;
    free_mib: number;
    percent_used: number;
  };
  disk: DiskUsage;
}

export interface NextEpisode {
  episode: number | null;
  airingAt: number | null;
  airingAtIso: string | null;
}

export interface AnimeToWatch {
  progress: number;
  link: string[];
  nextEpisode: NextEpisode | null;
}

export type ToWatch = Record<string, AnimeToWatch>;
