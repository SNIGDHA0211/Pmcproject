import type { User } from '../types';
import { clearAllTeamLeaderOverviewCaches } from './teamLeaderOverviewCache';
import { clearAllProjectDatesSectionCaches } from './projectDatesSectionCache';
import { clearAllPMCHead360Caches } from './pmcHead360Cache';
import { clearProjectRowCache } from './pmcHeadExecutiveProjects';

export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_KEY = 'user';
const LEGACY_BASIC_AUTH_KEY = 'basicAuth';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function setTokens(access: string, refresh: string): void {
  setAccessToken(access);
  setRefreshToken(refresh);
}

export function setStoredUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function clearAuthStorage(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_BASIC_AUTH_KEY);
  clearAppDataCaches();
}

/** Drop persisted/in-memory project caches (login, logout, create project). */
export function clearAppDataCaches(): void {
  clearAllTeamLeaderOverviewCaches();
  clearAllProjectDatesSectionCaches();
  clearAllPMCHead360Caches();
  clearProjectRowCache();
}

export function clearLegacyBasicAuth(): void {
  localStorage.removeItem(LEGACY_BASIC_AUTH_KEY);
}

export function hasAuthTokens(): boolean {
  return Boolean(getAccessToken() || getRefreshToken());
}
