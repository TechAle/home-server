import type {AuthSession, MeResponse} from '../types/api';
import {request} from './client';

export function login(
  username: string,
  password: string,
): Promise<AuthSession> {
  return request<AuthSession>('/auth/login', {
    method: 'POST',
    body: {username, password},
    auth: false,
  });
}

export function register(
  username: string,
  password: string,
  registrationKey: string,
): Promise<AuthSession> {
  return request<AuthSession>('/auth/register', {
    method: 'POST',
    body: {username, password, registrationKey},
    auth: false,
  });
}

export function me(): Promise<MeResponse> {
  return request<MeResponse>('/auth/me');
}

export function logout(): Promise<void> {
  return request<void>('/auth/logout', {method: 'POST'});
}
