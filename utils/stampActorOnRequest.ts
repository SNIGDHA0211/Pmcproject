import type { InternalAxiosRequestConfig } from 'axios';
import { getStoredUser } from './authStorage';
import { resolveActorFromUser } from './actorDisplay';

const SKIP_URL_PARTS = [
  '/alerts/',
  '/notifications/',
  '/auth/',
  '/token/',
  '/available-users/',
];

function shouldSkipUrl(url?: string): boolean {
  const lower = (url || '').toLowerCase();
  return SKIP_URL_PARTS.some((part) => lower.includes(part));
}

export function stampActorOnRequest(config: InternalAxiosRequestConfig): void {
  const method = config.method?.toUpperCase();
  if (!method || method === 'GET' || method === 'DELETE') return;
  if (shouldSkipUrl(config.url)) return;

  const user = getStoredUser();
  const actor = resolveActorFromUser(user);
  if (!user || !actor) return;

  const stamp: Record<string, string> = {
    updated_by_name: user.name || actor.displayName,
    updated_by_username: user.username || '',
    created_by_name: user.name || actor.displayName,
    created_by_username: user.username || '',
    sender_name: actor.displayName,
    sender_username: user.username || '',
    sender_role: actor.roleLabel,
  };

  Object.keys(stamp).forEach((key) => {
    if (!stamp[key]) delete stamp[key];
  });

  if (config.data instanceof FormData) {
    Object.entries(stamp).forEach(([key, value]) => {
      if (!config.data.has(key)) {
        config.data.append(key, value);
      }
    });
    return;
  }

  if (config.data && typeof config.data === 'object') {
    config.data = { ...(config.data as Record<string, unknown>), ...stamp };
    return;
  }

  config.data = stamp;
}
