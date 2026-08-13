/**
 * Persist tutorial video media in the browser Cache API (large quota).
 * Cleared on logout / session wipe via clearAppDataCaches.
 */
const CACHE_NAME = 'pmc-tutorial-videos-v1';

/** Object URLs / remote URLs for the current session. */
const playbackUrlById = new Map<number, string>();

function cacheRequestForId(id: number): Request {
  return new Request(`https://pmc-portal.local/tutorial-videos/${id}/media`, {
    method: 'GET',
  });
}

function canUseCacheApi(): boolean {
  return typeof window !== 'undefined' && typeof caches !== 'undefined';
}

export function getTutorialVideoObjectUrl(id: number): string | null {
  return playbackUrlById.get(id) ?? null;
}

export function rememberTutorialVideoObjectUrl(id: number, url: string): void {
  if (!id || !url) return;
  const prev = playbackUrlById.get(id);
  if (prev && prev !== url && prev.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(prev);
    } catch {
      /* ignore */
    }
  }
  playbackUrlById.set(id, url);
}

export async function readTutorialVideoBlobFromCache(id: number): Promise<Blob | null> {
  if (!canUseCacheApi() || !id) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(cacheRequestForId(id));
    if (!hit || !hit.ok) return null;
    return await hit.blob();
  } catch {
    return null;
  }
}

export async function writeTutorialVideoBlobToCache(
  id: number,
  blob: Blob,
): Promise<boolean> {
  if (!canUseCacheApi() || !id || !blob || blob.size <= 0) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    const contentType = blob.type || 'video/mp4';
    const response = new Response(blob, {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(blob.size),
        'X-PMC-Tutorial-Video-Id': String(id),
        'X-PMC-Cached-At': new Date().toISOString(),
      },
    });
    await cache.put(cacheRequestForId(id), response);
    return true;
  } catch {
    return false;
  }
}

export async function deleteTutorialVideoBlobFromCache(id: number): Promise<void> {
  const url = playbackUrlById.get(id);
  if (url?.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
  playbackUrlById.delete(id);

  if (!canUseCacheApi() || !id) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(cacheRequestForId(id));
  } catch {
    /* ignore */
  }
}

/** Wipe all cached tutorial media (logout / login session reset). */
export async function clearTutorialVideoBrowserCache(): Promise<void> {
  for (const [, url] of playbackUrlById) {
    if (url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
    }
  }
  playbackUrlById.clear();

  if (!canUseCacheApi()) return;
  try {
    await caches.delete(CACHE_NAME);
  } catch {
    /* ignore */
  }
}

/**
 * Download remote video bytes into Cache API and return a blob: URL.
 * Falls back to the remote URL when fetch/CORS/quota fails.
 */
export async function resolveTutorialVideoPlaybackUrl(
  id: number,
  remoteUrl: string,
): Promise<string> {
  if (!id || !remoteUrl) return remoteUrl;

  const existing = getTutorialVideoObjectUrl(id);
  if (existing) return existing;

  const cachedBlob = await readTutorialVideoBlobFromCache(id);
  if (cachedBlob) {
    const objectUrl = URL.createObjectURL(cachedBlob);
    rememberTutorialVideoObjectUrl(id, objectUrl);
    return objectUrl;
  }

  try {
    const res = await fetch(remoteUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'force-cache',
    });
    if (!res.ok) {
      rememberTutorialVideoObjectUrl(id, remoteUrl);
      return remoteUrl;
    }
    const blob = await res.blob();
    if (!blob.size) {
      rememberTutorialVideoObjectUrl(id, remoteUrl);
      return remoteUrl;
    }
    await writeTutorialVideoBlobToCache(id, blob);
    const objectUrl = URL.createObjectURL(blob);
    rememberTutorialVideoObjectUrl(id, objectUrl);
    return objectUrl;
  } catch {
    rememberTutorialVideoObjectUrl(id, remoteUrl);
    return remoteUrl;
  }
}
