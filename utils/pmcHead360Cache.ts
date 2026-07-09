import type { DPR, Project } from '../types';
import type { ProjectVitalsCard } from './projectVitals';

const CACHE_VERSION = 1;
const CACHE_PREFIX = 'pmc.head360';
/** Display cache TTL — stale entries are discarded */
const TTL_MS = 30 * 60 * 1000;

export interface PMCHead360CachePayload {
  v: typeof CACHE_VERSION;
  cachedAt: string;
  userId: string;
  projectFingerprint: string;
  dprsFingerprint: string;
  cards: ProjectVitalsCard[];
}

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
  return cards.filter(isValidCard);
}

export function readPMCHead360Cache(
  userId: string,
  projects: Project[],
  dprs: DPR[],
): PMCHead360CachePayload | null {
  if (!userId || projects.length === 0 || typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PMCHead360CachePayload;
    if (parsed.v !== CACHE_VERSION || parsed.userId !== userId) {
      localStorage.removeItem(cacheKey(userId));
      return null;
    }

    const age = Date.now() - new Date(parsed.cachedAt).getTime();
    if (!Number.isFinite(age) || age > TTL_MS) {
      localStorage.removeItem(cacheKey(userId));
      return null;
    }

    const projectFingerprint = buildProjectsFingerprint(projects);
    const dprsFingerprint = buildDprsFingerprint(projects, dprs);
    if (
      parsed.projectFingerprint !== projectFingerprint ||
      parsed.dprsFingerprint !== dprsFingerprint
    ) {
      return null;
    }

    const cards = sanitizeCards(parsed.cards);
    if (cards.length === 0) return null;

    return { ...parsed, cards };
  } catch {
    return null;
  }
}

export function writePMCHead360Cache(
  userId: string,
  payload: PMCHead360CachePayload,
): void {
  if (!userId || payload.userId !== userId || typeof window === 'undefined') return;

  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(payload));
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
  if (typeof window === 'undefined' || !userId) return;
  localStorage.removeItem(cacheKey(userId));
}

/** Remove every PMC Head 360° cache (e.g. on logout) */
export function clearAllPMCHead360Caches(): void {
  if (typeof window === 'undefined') return;

  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${CACHE_PREFIX}.`)) localStorage.removeItem(key);
  }
}
