import type { FinancialCacheEntry, FinancialDataSnapshot } from '../types/financialManagementCache';

/** Cache TTL: 10 minutes */
export const FINANCIAL_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Project-wise financial data cache (persists across route navigations).
 * Each entry stores the month/year period used when the snapshot was fetched.
 */
const financialCache: Record<string, FinancialCacheEntry> = {};

export function getFinancialCacheEntry(projectName: string): FinancialCacheEntry | undefined {
  return financialCache[projectName];
}

export function setFinancialCacheEntry(
  projectName: string,
  month: number,
  year: number,
  snapshot: FinancialDataSnapshot
): void {
  financialCache[projectName] = {
    month,
    year,
    snapshot,
    fetchedAt: Date.now(),
  };
}

export function patchFinancialCacheEntry(
  projectName: string,
  month: number,
  year: number,
  patch: Partial<FinancialDataSnapshot>
): void {
  const existing = financialCache[projectName];
  if (!existing || existing.month !== month || existing.year !== year) {
    return;
  }
  existing.snapshot = { ...existing.snapshot, ...patch };
  existing.fetchedAt = Date.now();
}

export function isFinancialCacheFresh(entry: FinancialCacheEntry): boolean {
  return Date.now() - entry.fetchedAt < FINANCIAL_CACHE_TTL_MS;
}

export function isFinancialCacheStale(entry: FinancialCacheEntry): boolean {
  return !isFinancialCacheFresh(entry);
}

export function financialCacheMatchesPeriod(
  entry: FinancialCacheEntry | undefined,
  month: number,
  year: number
): boolean {
  return Boolean(entry && entry.month === month && entry.year === year);
}

export function invalidateFinancialCache(projectName?: string): void {
  if (projectName) {
    delete financialCache[projectName];
    return;
  }
  Object.keys(financialCache).forEach((key) => delete financialCache[key]);
}

/** For debugging / tests */
export function getFinancialCacheKeys(): string[] {
  return Object.keys(financialCache);
}
