/**
 * Professional project cover images — unique per project, keyword-matched,
 * auto-assigned when Head creates a project (no upload prompt).
 */

export type CoverCategory =
  | 'flyover'
  | 'bridge'
  | 'road'
  | 'metro'
  | 'building'
  | 'multiplex'
  | 'park'
  | 'promenade'
  | 'industrial'
  | 'general';

type CoverAsset = {
  url: string;
  category: CoverCategory;
};

/** Verified Unsplash construction / infrastructure assets (unique URLs). */
const COVER_ASSETS: readonly CoverAsset[] = [
  // Flyovers / elevated roads
  { category: 'flyover', url: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?auto=format&fit=crop&w=900&q=80' },
  { category: 'flyover', url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=900&q=80' },
  { category: 'flyover', url: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=900&q=80' },
  { category: 'flyover', url: 'https://images.unsplash.com/photo-1431576901776-e539bd916ba2?auto=format&fit=crop&w=900&q=80' },
  // Bridges / ROB
  { category: 'bridge', url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=900&q=80' },
  { category: 'bridge', url: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=900&q=80' },
  { category: 'bridge', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=900&q=80' },
  { category: 'bridge', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80' },
  // Roads / highways
  { category: 'road', url: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=900&q=80' },
  { category: 'road', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80' },
  { category: 'road', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=900&q=80' },
  { category: 'road', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80' },
  // High-rise / buildings (bright exteriors)
  { category: 'building', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80' },
  { category: 'building', url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=900&q=80' },
  { category: 'building', url: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=900&q=80' },
  { category: 'building', url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=80' },
  { category: 'building', url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=900&q=80' },
  { category: 'building', url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80' },
  { category: 'building', url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80' },
  { category: 'building', url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=80' },
  // Multiplex / commercial
  { category: 'multiplex', url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80' },
  { category: 'multiplex', url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=80' },
  { category: 'multiplex', url: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=900&q=80' },
  // Parks / open landscape
  { category: 'park', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80' },
  { category: 'park', url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80' },
  // Promenade / waterfront
  { category: 'promenade', url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=900&q=80' },
  { category: 'promenade', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=900&q=80' },
  // Industrial / site works
  { category: 'industrial', url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=900&q=80' },
  { category: 'industrial', url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=900&q=80' },
  { category: 'industrial', url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=80' },
  { category: 'industrial', url: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=900&q=80' },
  { category: 'industrial', url: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=900&q=80' },
  { category: 'industrial', url: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=900&q=80' },
  // Metro / transit (bright worksite / city) — unique URLs only
  { category: 'metro', url: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=900&q=80' },
  { category: 'metro', url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=900&q=80' },
  { category: 'metro', url: 'https://images.unsplash.com/photo-1581092335397-9583eb92d232?auto=format&fit=crop&w=900&q=80' },
  // General construction fallbacks
  { category: 'general', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80' },
] as const;

const STORAGE_KEY = 'pmc.projectCoverAssignments.v5';

/** Flat unique URL list (legacy helpers / fallbacks). */
export const PROJECT_COVER_PHOTOS = Array.from(new Set(COVER_ASSETS.map((a) => a.url)));

function hashKey(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function readAssignments(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAssignments(map: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Infer cover category from project title / location.
 * Prefer structure type (building / flyover) over client acronyms (MMRCL, GSIDC).
 */
export function inferCoverCategory(title?: string | null, location?: string | null): CoverCategory {
  const text = `${title ?? ''} ${location ?? ''}`.toLowerCase();

  if (/\b(flyover|fly over|elevated|kbr park)\b/.test(text)) return 'flyover';
  if (/\b(rob|bridge)\b/.test(text)) return 'bridge';
  if (/\b(building|g\s*\+\s*\d+|g3|tower|avissa|shivalik|shivalika|girgaon|kalbadevi)\b/.test(text)) {
    return 'building';
  }
  if (/\b(multiplex|khb|mall|cinema|kengeri)\b/.test(text)) return 'multiplex';
  if (/\b(promenade|waterfront)\b/.test(text)) return 'promenade';
  if (/\b(road|highway|nhidcl|rambrai|nongstoin)\b/.test(text)) return 'road';
  if (/\b(4-lane|lane)\b/.test(text) && /\b(rob|margao|goa)\b/.test(text)) return 'bridge';
  if (/\b(metro|transit|hsg|police|mmrcl)\b/.test(text)) return 'metro';
  if (/\b(park|sagar|fox)\b/.test(text)) return 'park';
  if (/\b(pkg|package|industrial|atlas|chembur)\b/.test(text)) return 'industrial';
  if (/\b(mahim|santacruz|hyderabad|uppal|aoc|center|centre)\b/.test(text)) return 'building';
  if (/\b(margao|goa|gsidc)\b/.test(text)) return 'promenade';
  return 'general';
}

function assetsForCategory(category: CoverCategory): CoverAsset[] {
  const matched = COVER_ASSETS.filter((a) => a.category === category);
  if (matched.length > 0) return [...matched];
  return COVER_ASSETS.filter((a) => a.category === 'general' || a.category === 'building' || a.category === 'industrial');
}

function pickPreferredUrl(
  category: CoverCategory,
  used: Set<string>,
  seed: string,
): string {
  const preferred = assetsForCategory(category);
  const pool = preferred.length > 0 ? preferred : [...COVER_ASSETS];
  const freePreferred = pool.filter((a) => !used.has(a.url));
  if (freePreferred.length > 0) {
    return freePreferred[hashKey(seed) % freePreferred.length].url;
  }
  const freeAny = COVER_ASSETS.filter((a) => !used.has(a.url));
  if (freeAny.length > 0) {
    return freeAny[hashKey(seed) % freeAny.length].url;
  }
  // Exhausted unique pool — still keep category preference
  return pool[hashKey(seed) % pool.length].url;
}

/**
 * Ensure this project has a persisted cover image (auto on create / first view).
 * Prefers category match and avoids reusing URLs already assigned to other projects.
 */
export function ensureProjectCoverAssigned(
  projectId: string,
  title?: string | null,
  location?: string | null,
): string {
  const id = String(projectId ?? '').trim();
  if (!id) {
    return COVER_ASSETS[0].url;
  }

  const map = readAssignments();
  const existing = map[id];
  const category = inferCoverCategory(title, location);
  const existingAsset = existing
    ? COVER_ASSETS.find((a) => a.url === existing)
    : undefined;

  // Keep existing only when it still matches the project's category
  if (existingAsset && existingAsset.category === category) {
    return existing;
  }

  const used = new Set(
    Object.entries(map)
      .filter(([key, url]) => key !== id && Boolean(url))
      .map(([, url]) => url),
  );
  const url = pickPreferredUrl(category, used, `${id}|${title ?? ''}`);
  map[id] = url;
  writeAssignments(map);
  return url;
}

/**
 * Resolve unique covers for a portfolio list.
 * Reassigns collisions so no two visible projects share the same image when possible.
 */
export function resolveUniqueProjectCovers(
  projects: Array<{ id: string; title?: string; location?: string }>,
): Record<string, string> {
  const map = readAssignments();
  const used = new Set<string>();
  const result: Record<string, string> = {};

  // Stable order so assignments don't thrash between renders
  const ordered = [...projects].sort((a, b) =>
    String(a.id).localeCompare(String(b.id), undefined, { sensitivity: 'base' }),
  );

  for (const project of ordered) {
    const id = String(project.id);
    const preferred = map[id];
    const category = inferCoverCategory(project.title, project.location);
    const preferredAsset = preferred
      ? COVER_ASSETS.find((a) => a.url === preferred)
      : undefined;
    const preferredOk =
      preferredAsset &&
      preferredAsset.category === category &&
      !used.has(preferred);

    let url = preferredOk
      ? preferred!
      : pickPreferredUrl(category, used, `${id}|${project.title ?? ''}`);

    // If preferred was taken, force a free unique pick
    if (used.has(url)) {
      url = pickPreferredUrl(category, used, `${id}|${project.title ?? ''}|retry`);
    }

    used.add(url);
    result[id] = url;
    map[id] = url;
  }

  writeAssignments(map);
  return result;
}

/** Deterministic cover for a single project (persists + unique vs stored set). */
export function getProjectCoverPhoto(
  projectId: string,
  title?: string,
  location?: string,
): string {
  return ensureProjectCoverAssigned(projectId, title, location);
}

export function getProjectCoverIndex(projectId: string, title?: string): number {
  const url = getProjectCoverPhoto(projectId, title);
  const idx = PROJECT_COVER_PHOTOS.indexOf(url);
  return idx >= 0 ? idx : 0;
}

/** Persist a working cover after an image load failure. */
export function replaceProjectCoverAssignment(projectId: string, url: string): void {
  const id = String(projectId ?? '').trim();
  if (!id || !url) return;
  const map = readAssignments();
  map[id] = url;
  writeAssignments(map);
}

/** Next cover when the current image fails to load (skips duplicates in-session via attempt). */
export function getFallbackCoverPhoto(failedUrl: string, attempt = 1): string {
  const currentIndex = PROJECT_COVER_PHOTOS.findIndex((url) => url === failedUrl);
  const start = currentIndex >= 0 ? currentIndex : 0;
  const next = (start + Math.max(1, attempt)) % PROJECT_COVER_PHOTOS.length;
  return PROJECT_COVER_PHOTOS[next];
}
