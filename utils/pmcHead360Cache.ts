import type { DPR, Project } from '../types';
import type { ProjectVitalsCard } from './projectVitals';

const CACHE_VERSION = 5;
const CACHE_PREFIX = 'pmc.head360';
/**
 * Fresh TTL — within this window, remount/reload skips network revalidation
 * to avoid rate limits. Manual refresh still forces a live fetch.
 */
export const PMC_HEAD_360_FRESH_TTL_MS = 30 * 60 * 1000;

export interface PMCHead360CachePayload {
  v: typeof CACHE_VERSION;
  cachedAt: string;
  userId: string;
  projectFingerprint: string;
  dprsFingerprint: string;
  cards: ProjectVitalsCard[];
}

/** Same-session memory layer — survives tab remounts without reading localStorage. */
const memoryCache = new Map<string, PMCHead360CachePayload>();

function cacheKey(userId: string): string {
  return `${CACHE_PREFIX}.v${CACHE_VERSION}.${userId}`;
}

export function buildProjectsFingerprint(projects: Pick<Project, 'id'>[]): string {
  return projects
    .map((p) => p.id)
    .sort()
    .join('|');
}

export function buildDprsFingerprint(projects: Project[], dprs: DPR[]): string {
  return projects
    .map((p) => {
      const count = dprs.filter(
        (d) => d.projectId === p.id || d.projectName === p.title,
      ).length;
      return `${p.id}:${count}`;
    })
    .sort()
    .join('|');
}

function isValidCard(card: unknown): card is ProjectVitalsCard {
  if (!card || typeof card !== 'object') return false;
  const c = card as ProjectVitalsCard;
  return (
    typeof c.projectId === 'string' &&
    typeof c.title === 'string' &&
    Array.isArray(c.vitals)
  );
}

function sanitizeCards(cards: unknown): ProjectVitalsCard[] {
  if (!Array.isArray(cards)) return [];
  return cards.filter(isValidCard).map((card) => ({
    ...card,
    client: card.client ?? '—',
    progressPct: card.progressPct ?? null,
    openIssues: card.openIssues ?? 0,
    dprCount: card.dprCount ?? 0,
    drawingApprovalPct: card.drawingApprovalPct ?? null,
  }));
}

export function getPMCHead360CacheAgeMs(payload: PMCHead360CachePayload): number {
  const age = Date.now() - new Date(payload.cachedAt).getTime();
  return Number.isFinite(age) ? age : Number.POSITIVE_INFINITY;
}

/** True when cache is recent enough to skip network (default 30 min). */
export function isPMCHead360CacheFresh(
  payload: PMCHead360CachePayload,
  maxAgeMs: number = PMC_HEAD_360_FRESH_TTL_MS,
): boolean {
  const age = getPMCHead360CacheAgeMs(payload);
  return age >= 0 && age <= maxAgeMs;
}

function fingerprintsMatch(
  parsed: PMCHead360CachePayload,
  projects: Project[],
  dprs: DPR[],
): boolean {
  return (
    parsed.projectFingerprint === buildProjectsFingerprint(projects) &&
    parsed.dprsFingerprint === buildDprsFingerprint(projects, dprs)
  );
}

function normalizePayload(parsed: PMCHead360CachePayload): PMCHead360CachePayload | null {
  if (parsed.v !== CACHE_VERSION) return null;
  const cards = sanitizeCards(parsed.cards);
  if (cards.length === 0) return null;
  return { ...parsed, cards };
}

export function readPMCHead360Cache(
  userId: string,
  projects: Project[],
  dprs: DPR[],
): PMCHead360CachePayload | null {
  if (!userId || projects.length === 0) return null;

  const mem = memoryCache.get(userId);
  if (mem) {
    const age = getPMCHead360CacheAgeMs(mem);
    if (age > PMC_HEAD_360_FRESH_TTL_MS) {
      memoryCache.delete(userId);
    } else if (fingerprintsMatch(mem, projects, dprs)) {
      const normalized = normalizePayload(mem);
      if (normalized) return normalized;
    }
  }

  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PMCHead360CachePayload;
    if (parsed.v !== CACHE_VERSION || parsed.userId !== userId) {
      localStorage.removeItem(cacheKey(userId));
      memoryCache.delete(userId);
      return null;
    }

    const age = getPMCHead360CacheAgeMs(parsed);
    if (age < 0 || age > PMC_HEAD_360_FRESH_TTL_MS) {
      localStorage.removeItem(cacheKey(userId));
      memoryCache.delete(userId);
      return null;
    }

    if (!fingerprintsMatch(parsed, projects, dprs)) {
      return null;
    }

    const normalized = normalizePayload(parsed);
    if (!normalized) {
      localStorage.removeItem(cacheKey(userId));
      return null;
    }

    memoryCache.set(userId, normalized);
    return normalized;
  } catch {
    return null;
  }
}

export function writePMCHead360Cache(
  userId: string,
  payload: PMCHead360CachePayload,
): void {
  if (!userId || payload.userId !== userId) return;

  const normalized = normalizePayload(payload);
  if (!normalized) return;

  memoryCache.set(userId, normalized);

  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(normalized));
  } catch (error) {
    console.warn('[PMC Head 360 cache] Failed to persist:', error);
  }
}

export function buildPMCHead360CachePayload(
  userId: string,
  projects: Project[],
  dprs: DPR[],
  cards: ProjectVitalsCard[],
): PMCHead360CachePayload {
  return {
    v: CACHE_VERSION,
    cachedAt: new Date().toISOString(),
    userId,
    projectFingerprint: buildProjectsFingerprint(projects),
    dprsFingerprint: buildDprsFingerprint(projects, dprs),
    cards,
  };
}

export function clearPMCHead360Cache(userId: string): void {
  if (!userId) return;
  memoryCache.delete(userId);
  if (typeof window === 'undefined') return;
  localStorage.removeItem(cacheKey(userId));
}

/** Remove every PMC Head 360° cache (e.g. on logout) */
export function clearAllPMCHead360Caches(): void {
  memoryCache.clear();
  if (typeof window === 'undefined') return;

  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${CACHE_PREFIX}.`)) localStorage.removeItem(key);
  }
}
