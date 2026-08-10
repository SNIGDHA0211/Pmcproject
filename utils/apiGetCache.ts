/**
 * In-flight dedupe + short TTL cache for GET requests.
 * Mutations invalidate matching URL prefixes so fresh data is loaded after writes.
 */

import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';

type CacheEntry = {
  expiresAt: number;
  response: AxiosResponse;
};

const inflight = new Map<string, Promise<AxiosResponse>>();
const cache = new Map<string, CacheEntry>();

/** Default TTL for list/detail GETs — enough to collapse login + child remount storms. */
const DEFAULT_TTL_MS = 30_000;

const SKIP_PATH_PARTS = [
  '/token/',
  '/auth/',
  '/accounts/me/',
  '/notifications/',
];

function methodOf(config: AxiosRequestConfig): string {
  return String(config.method || 'get').toLowerCase();
}

function normalizePath(url?: string): string {
  if (!url) return '';
  try {
    if (/^[a-z][a-z\d+\-.]*:\/\//i.test(url)) {
      return new URL(url).pathname.toLowerCase();
    }
  } catch {
    // fall through
  }
  const path = url.split('?')[0] || '';
  return path.toLowerCase();
}

function shouldSkipCache(config: AxiosRequestConfig): boolean {
  if (methodOf(config) !== 'get') return true;
  if ((config as InternalAxiosRequestConfig & { skipGetCache?: boolean }).skipGetCache) {
    return true;
  }
  const path = normalizePath(config.url);
  return SKIP_PATH_PARTS.some((part) => path.includes(part));
}

function ttlForPath(path: string): number {
  if (path.includes('/projects-data/projects')) return 45_000;
  if (path.includes('/dpr')) return 20_000;
  if (path.includes('/alerts')) return 15_000;
  if (path.includes('/available-users')) return 120_000;
  if (path.includes('/overview')) return 30_000;
  if (path.includes('/cost-performance') || path.includes('/project-progress')) {
    return 25_000;
  }
  return DEFAULT_TTL_MS;
}

export function buildGetCacheKey(config: AxiosRequestConfig, baseURL?: string): string {
  const method = methodOf(config);
  const base = String(config.baseURL || baseURL || '').replace(/\/+$/, '');
  const url = String(config.url || '');
  const absolute = /^[a-z][a-z\d+\-.]*:\/\//i.test(url)
    ? url
    : `${base}${url.startsWith('/') ? '' : '/'}${url}`;

  let paramsKey = '';
  if (config.params && typeof config.params === 'object') {
    try {
      const entries = Object.entries(config.params as Record<string, unknown>)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .sort(([a], [b]) => a.localeCompare(b));
      paramsKey = JSON.stringify(entries);
    } catch {
      paramsKey = String(config.params);
    }
  }

  return `${method}|${absolute}|${paramsKey}`;
}

function cloneResponse(response: AxiosResponse): AxiosResponse {
  return {
    ...response,
    // Shallow clone config so consumers don't mutate shared cached config
    config: { ...response.config },
    headers: { ...response.headers },
    data: response.data,
  };
}

export function clearApiGetCache(): void {
  inflight.clear();
  cache.clear();
}

/** Drop cached GETs whose URL contains any of the given path fragments. */
export function invalidateApiGetCache(pathFragments: string[]): void {
  if (!pathFragments.length) {
    clearApiGetCache();
    return;
  }
  const needles = pathFragments.map((p) => p.toLowerCase());
  for (const key of [...cache.keys()]) {
    if (needles.some((n) => key.toLowerCase().includes(n))) {
      cache.delete(key);
    }
  }
  for (const key of [...inflight.keys()]) {
    if (needles.some((n) => key.toLowerCase().includes(n))) {
      inflight.delete(key);
    }
  }
}

function invalidateFromMutation(config: AxiosRequestConfig): void {
  const path = normalizePath(config.url);
  if (!path) {
    clearApiGetCache();
    return;
  }

  // Invalidate the resource family (list + detail prefixes).
  const parts = path.split('/').filter(Boolean);
  const fragments: string[] = [];
  if (parts.length >= 1) fragments.push(`/${parts[0]}/`);
  if (parts.length >= 2) fragments.push(`/${parts[0]}/${parts[1]}`);
  // Common list aliases
  if (path.includes('/projects')) {
    fragments.push('/projects-data/projects', '/projects/overview', '/projects/init');
  }
  if (path.includes('/dpr')) fragments.push('/dpr');
  if (path.includes('/alerts')) fragments.push('/alerts');
  if (path.includes('/monthly-scope')) fragments.push('/monthly-scope');
  if (path.includes('/cost-performance')) fragments.push('/cost-performance');
  if (path.includes('/project-progress')) fragments.push('/project-progress');

  invalidateApiGetCache(fragments);
}

/**
 * Wrap an Axios instance adapter so identical in-flight GETs share one network
 * call and recent successful GETs are served from a short TTL cache.
 */
function resolveAxiosAdapter(instance: {
  defaults: { adapter?: AxiosAdapter | AxiosAdapter[] | string | string[] };
}): AxiosAdapter {
  const configured = instance.defaults.adapter;
  // Axios may store adapter as a name/array (e.g. ['xhr','http']) — not callable.
  if (typeof configured === 'function') {
    return configured;
  }
  const resolved = axios.getAdapter(configured ?? ['xhr', 'http']);
  if (typeof resolved !== 'function') {
    throw new Error('Unable to resolve Axios HTTP adapter for GET cache.');
  }
  return resolved as AxiosAdapter;
}

export function installGetRequestCache(
  instance: {
    defaults: {
      adapter?: AxiosAdapter | AxiosAdapter[] | string | string[];
      baseURL?: string;
    };
  },
): void {
  const prior = resolveAxiosAdapter(instance);

  instance.defaults.adapter = async (config) => {
    if (shouldSkipCache(config)) {
      const response = await prior(config);
      if (methodOf(config) !== 'get') {
        invalidateFromMutation(config);
      }
      return response;
    }

    const key = buildGetCacheKey(config, instance.defaults.baseURL);
    const now = Date.now();
    const hit = cache.get(key);
    if (hit && hit.expiresAt > now) {
      return cloneResponse(hit.response);
    }

    const pending = inflight.get(key);
    if (pending) {
      return pending.then(cloneResponse);
    }

    const path = normalizePath(config.url);
    const ttl = ttlForPath(path);

    const requestPromise = Promise.resolve(prior(config))
      .then((response) => {
        if (response.status >= 200 && response.status < 300) {
          cache.set(key, {
            expiresAt: Date.now() + ttl,
            response: cloneResponse(response),
          });
        }
        return response;
      })
      .finally(() => {
        inflight.delete(key);
      });

    inflight.set(key, requestPromise);
    return requestPromise;
  };
}
