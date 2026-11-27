import {request} from './client';

export interface FoundryStatus {
  online: boolean;
  service: string;
  error?: string;
}

export function fetchFoundryStatus(): Promise<FoundryStatus> {
  return request<FoundryStatus>('/foundry/status');
}

export function startFoundry(): Promise<{ok: boolean}> {
  return request<{ok: boolean}>('/foundry/start', {method: 'POST'});
}

export function restartFoundry(): Promise<{ok: boolean}> {
  return request<{ok: boolean}>('/foundry/restart', {method: 'POST'});
}
