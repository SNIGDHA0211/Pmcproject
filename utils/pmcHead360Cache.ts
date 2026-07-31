import type { DPR, Project } from '../types';

/**
 * Fingerprints for PMC Head 360° effect deps only.
 * API responses are not persisted — Redis + live fetch own caching.
 */

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

/** Purge legacy browser caches from older app versions. */
export function clearAllPMCHead360Caches(): void {
  if (typeof window === 'undefined') return;
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key?.startsWith('pmc.head360.')) localStorage.removeItem(key);
  }
}

export function clearPMCHead360Cache(_userId?: string): void {
  clearAllPMCHead360Caches();
}
