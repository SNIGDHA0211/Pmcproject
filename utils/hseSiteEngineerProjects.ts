import type { Project } from '../types';

/**
 * Official client portfolio — titles from PMC Client Login Credentials PDF,
 * plus later projects (e.g. B3482 RGSL / pmc_*27).
 * Same list drives Head / HO / Manager overview dropdowns and site-role assignment titles.
 */
export const HSE_SITE_ENGINEER_ACCOUNTS: ReadonlyArray<{
  index: number;
  username: string;
  projectTitle: string;
}> = [
  { index: 1, username: 'pmc_hse1', projectTitle: 'KHB Multiplex, Kengeri (A-3462)' },
  { index: 2, username: 'pmc_hse2', projectTitle: 'SWB Shillong PKG -1' },
  { index: 3, username: 'pmc_hse3', projectTitle: 'SWB Shillong PKG -II' },
  { index: 4, username: 'pmc_hse4', projectTitle: 'SWB Shillong PKG – III' },
  { index: 5, username: 'pmc_hse5', projectTitle: 'G3 Building – Girgaon (MMRCL)' },
  { index: 6, username: 'pmc_hse6', projectTitle: 'K3 Building – Kalbadevi (MMRCL)' },
  { index: 7, username: 'pmc_hse7', projectTitle: 'KBR Park -I Flyover – Hyderabad (GHMC)' },
  { index: 8, username: 'pmc_hse8', projectTitle: 'KBR Park -II Flyover – Hyderabad (GHMC)' },
  { index: 9, username: 'pmc_hse9', projectTitle: 'FOX SAGAR – Hyderabad' },
  { index: 10, username: 'pmc_hse10', projectTitle: 'Mayapur Flyover' },
  { index: 11, username: 'pmc_hse11', projectTitle: 'Nongstoin-Rambrai Road, Meghalaya (NHIDCL)' },
  { index: 12, username: 'pmc_hse12', projectTitle: 'Satis Thane' },
  { index: 13, username: 'pmc_hse13', projectTitle: '4-Lane ROB – Rawanfonda, Margao, Goa (GSIDC)' },
  { index: 14, username: 'pmc_hse14', projectTitle: 'New Promenade – Margao, Goa (GSIDC)' },
  { index: 15, username: 'pmc_hse15', projectTitle: 'Police HSG at MIDC Metro Station (MMRCL)' },
  { index: 16, username: 'pmc_hse16', projectTitle: 'Chembur (M-Four Atlas)' },
  { index: 17, username: 'pmc_hse17', projectTitle: 'JK PKG -1' },
  { index: 18, username: 'pmc_hse18', projectTitle: 'JK-PKG -2' },
  { index: 19, username: 'pmc_hse19', projectTitle: 'JK PKG 3' },
  { index: 20, username: 'pmc_hse20', projectTitle: 'AOC Center Hyderabad' },
  { index: 21, username: 'pmc_hse21', projectTitle: 'Uppal Hyderabad' },
  { index: 22, username: 'pmc_hse22', projectTitle: 'Avissa G+40, Mahim' },
  { index: 23, username: 'pmc_hse23', projectTitle: 'Shivalik Building Santacruz' },
  { index: 24, username: 'pmc_hse24', projectTitle: 'AVISSA' },
  {
    index: 27,
    username: 'pmc_hse27',
    projectTitle: 'B3482 RGSL: Rajeev Gandhi Sea Link',
  },
] as const;

const HSE_USERNAME_PATTERN = /^pmc_hse(\d+)$/i;

export function normalizeProjectTitleKey(title?: string | null): string {
  return String(title ?? '')
    .trim()
    .toLowerCase()
    // Corrupted en/em dash often becomes ??? in Latin-1/UTF-8 mismatches
    .replace(/\?{2,3}/g, '-')
    .replace(/[–—−-]+/g, '-')
    .replace(/\s+/g, ' ');
}

/**
 * Fix display of project names where en/em dashes were corrupted to ???
 * (or UTF-8 mojibake). Prefer the official portfolio spelling when matched.
 */
export function sanitizeProjectDisplayName(title?: string | null): string {
  const raw = String(title ?? '').trim();
  if (!raw) return '';

  const cleaned = raw
    .replace(/\uFFFD+/g, '–')
    .replace(/â€“|â€”/g, '–')
    .replace(/\s*\?{2,3}\s*/g, ' – ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const match = HSE_SITE_ENGINEER_ACCOUNTS.find(
    (row) =>
      areDuplicateProjectTitles(row.projectTitle, cleaned) ||
      areDuplicateProjectTitles(row.projectTitle, raw),
  );
  return match?.projectTitle ?? cleaned;
}

/** Strip location suffixes / parentheses so "X, Goa (GSIDC)" matches "X". */
export function coreProjectTitleKey(title?: string | null): string {
  let key = normalizeProjectTitleKey(title);
  if (!key) return '';
  // PDF canonical is Mayapur; treat Miyapur as the same project spelling variant
  key = key.replace(/\bmiyapur\b/g, 'mayapur');
  key = key.replace(/\s*\([^)]*\)\s*/g, ' ');
  key = key.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  return key;
}

/** True when two titles are the same project with spelling / suffix differences. */
export function areDuplicateProjectTitles(a?: string | null, b?: string | null): boolean {
  const ka = coreProjectTitleKey(a);
  const kb = coreProjectTitleKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;

  const shorter = ka.length <= kb.length ? ka : kb;
  const longer = ka.length > kb.length ? ka : kb;
  // Require a meaningful shared prefix so "avissa" does not swallow "avissa g 40 mahim"
  if (shorter.length >= 14 && (longer === shorter || longer.startsWith(`${shorter} `))) {
    return true;
  }
  return false;
}

export function isHseSiteEngineerUsername(username?: string | null): boolean {
  return HSE_USERNAME_PATTERN.test(String(username ?? '').trim());
}

export function parseHseSiteEngineerIndex(username?: string | null): number | null {
  const match = String(username ?? '').trim().match(HSE_USERNAME_PATTERN);
  if (!match) return null;
  const index = Number(match[1]);
  return Number.isFinite(index) && index > 0 ? index : null;
}

export function resolveHseSiteEngineerAccount(username?: string | null) {
  const normalized = String(username ?? '').trim().toLowerCase();
  return HSE_SITE_ENGINEER_ACCOUNTS.find((row) => row.username === normalized) ?? null;
}

export function resolveHseSiteEngineerProjectTitle(username?: string | null): string | null {
  return resolveHseSiteEngineerAccount(username)?.projectTitle ?? null;
}

/** Match API project row to a canonical HSE assignment title. */
export function pickProjectByHseTitle(projects: Project[], canonicalTitle: string): Project | null {
  const targetKey = normalizeProjectTitleKey(canonicalTitle);
  const targetCore = coreProjectTitleKey(canonicalTitle);
  if (!targetKey) return null;

  const exact = projects.find(
    (project) => normalizeProjectTitleKey(project.title) === targetKey,
  );
  if (exact) return exact;

  const byCore = projects.find(
    (project) => areDuplicateProjectTitles(project.title, canonicalTitle),
  );
  if (byCore) return byCore;

  const loose = projects.find((project) => {
    const key = normalizeProjectTitleKey(project.title);
    const core = coreProjectTitleKey(project.title);
    if (key.includes(targetKey) || targetKey.includes(key)) return true;
    if (targetCore.length >= 14 && (core.startsWith(targetCore) || targetCore.startsWith(core))) {
      return true;
    }
    return false;
  });
  return loose ?? null;
}

export function projectTitleMatchesHseAssignment(
  projectTitle: string | undefined,
  canonicalTitle: string,
): boolean {
  if (areDuplicateProjectTitles(projectTitle, canonicalTitle)) return true;
  const rowKey = normalizeProjectTitleKey(projectTitle);
  const targetKey = normalizeProjectTitleKey(canonicalTitle);
  if (!rowKey || !targetKey) return false;
  return rowKey === targetKey || rowKey.includes(targetKey) || targetKey.includes(rowKey);
}
