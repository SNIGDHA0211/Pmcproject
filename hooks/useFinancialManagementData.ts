import { useCallback, useEffect, useRef } from 'react';
import type { FinancialDataSnapshot } from '../types/financialManagementCache';
import { fetchFinancialDataSnapshot } from '../services/financialDataService';
import {
  financialCacheMatchesPeriod,
  getFinancialCacheEntry,
  isFinancialCacheFresh,
  setFinancialCacheEntry,
} from '../utils/financialDataCache';

export type UseFinancialManagementDataOptions = {
  projectName: string;
  month: number;
  year: number;
  roleForSubmission: string;
  applySnapshot: (snapshot: FinancialDataSnapshot) => void;
  onInitialLoadingChange?: (loading: boolean) => void;
  onBackgroundRefreshingChange?: (refreshing: boolean) => void;
  onForceRefreshingChange?: (refreshing: boolean) => void;
};

export function useFinancialManagementData({
  projectName,
  month,
  year,
  roleForSubmission,
  applySnapshot,
  onInitialLoadingChange,
  onBackgroundRefreshingChange,
  onForceRefreshingChange,
}: UseFinancialManagementDataOptions) {
  const applySnapshotRef = useRef(applySnapshot);
  applySnapshotRef.current = applySnapshot;

  const fetchAndCache = useCallback(async (): Promise<FinancialDataSnapshot> => {
    const snapshot = await fetchFinancialDataSnapshot({
      projectName,
      month,
      year,
      roleForSubmission,
    });
    setFinancialCacheEntry(projectName, month, year, snapshot);
    applySnapshotRef.current(snapshot);
    return snapshot;
  }, [projectName, month, year, roleForSubmission]);

  const loadData = useCallback(
    async (options?: { force?: boolean }) => {
      if (!projectName.trim()) {
        onInitialLoadingChange?.(false);
        return;
      }

      const cached = getFinancialCacheEntry(projectName);
      const periodMatch = financialCacheMatchesPeriod(cached, month, year);

      if (!options?.force && periodMatch && cached) {
        applySnapshotRef.current(cached.snapshot);

        if (isFinancialCacheFresh(cached)) {
          return;
        }

        onBackgroundRefreshingChange?.(true);
        try {
          await fetchAndCache();
        } catch (e) {
          console.error('Financial data background refresh error', e);
        } finally {
          onBackgroundRefreshingChange?.(false);
        }
        return;
      }

      if (options?.force) {
        onForceRefreshingChange?.(true);
      } else {
        onInitialLoadingChange?.(true);
      }

      try {
        await fetchAndCache();
      } catch (e) {
        console.error('Financial data fetch error', e);
      } finally {
        onInitialLoadingChange?.(false);
        onForceRefreshingChange?.(false);
      }
    },
    [
      projectName,
      month,
      year,
      fetchAndCache,
      onInitialLoadingChange,
      onBackgroundRefreshingChange,
      onForceRefreshingChange,
    ]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const forceRefresh = useCallback(() => loadData({ force: true }), [loadData]);

  return { forceRefresh, fetchAndCache };
}
