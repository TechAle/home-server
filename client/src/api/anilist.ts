import type {ToWatch} from '../types/api';
import {request} from './client';

export function fetchAnimeLinks(): Promise<ToWatch> {
  return request<ToWatch>('/get_anime');
}
