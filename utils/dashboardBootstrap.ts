/**
 * Sprint 2 — idle financial prefetch helpers.
 * Overview bootstrap for the dashboard is owned by `stores/projectStore.ts`
 * (`bootstrapParallel` / `loadOverview`). Seed helpers below remain for cache cleanup only.
 */

import type { ProjectVitalsCard } from './projectVitals';
import {
  getProjectOverview,
  type ProjectOverviewResult,
} from '../services/projectOverviewService';
import { fetchProjectProgressChart } from '../services/financialDataService';
import { cashflowApi, costPerformanceApi, budgetPerformanceApi } from '../services/api';

export const DEFAULT_OVERVIEW_ORDERING = 'name';

type OverviewSeed = {
  cards: ProjectVitalsCard[];
  ordering: string;
  loadedAt: number;
};

/** @deprecated Prefer `projectStore` overview; kept for logout cache wipe. */
let overviewSeed: OverviewSeed | null = null;
let overviewInflight: Promise<ProjectOverviewResult> | null = null;
const overviewListeners = new Set<() => void>();

/** True when dashboard default filters match the bootstrap prefetch query. */
export function isDefaultOverviewQuery(opts: {
  search?: string;
  ordering?: string;
  clientFilter?: string;
  billingFilter?: string;
}): boolean {
  return (
    !opts.search?.trim() &&
    (opts.ordering || DEFAULT_OVERVIEW_ORDERING) === DEFAULT_OVERVIEW_ORDERING &&
    (opts.clientFilter || 'all') === 'all' &&
    (opts.billingFilter || 'all') === 'all'
  );
}

/** @deprecated Use `projectStore.getState().overview`. */
export function getOverviewBootstrapSeed(): OverviewSeed | null {
  return overviewSeed;
}

export function clearOverviewBootstrap(): void {
  overviewSeed = null;
  overviewInflight = null;
  overviewListeners.forEach((fn) => fn());
}

/** @deprecated Use `projectStore.subscribe`. */
export function subscribeOverviewBootstrap(listener: () => void): () => void {
  overviewListeners.add(listener);
  return () => {
    overviewListeners.delete(listener);
  };
}

function notifyOverviewListeners(): void {
  overviewListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore subscriber errors
    }
  });
}

/**
 * @deprecated Prefer `projectStore.loadOverview` / `bootstrapParallel`.
 * Kept so any leftover callers still hit the shared GET cache.
 */
export function prefetchDefaultProjectOverview(
  options?: { signal?: AbortSignal },
): Promise<ProjectOverviewResult> {
  if (overviewInflight) return overviewInflight;

  overviewInflight = getProjectOverview(
    { ordering: DEFAULT_OVERVIEW_ORDERING },
    { signal: options?.signal },
  )
    .then((result) => {
      overviewSeed = {
        cards: result.cards,
        ordering: DEFAULT_OVERVIEW_ORDERING,
        loadedAt: Date.now(),
      };
      notifyOverviewListeners();
      return result;
    })
    .finally(() => {
      overviewInflight = null;
    });

  return overviewInflight;
}

function runWhenIdle(task: () => void, timeoutMs = 4000): void {
  if (typeof window === 'undefined') return;
  const ric = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }
  ).requestIdleCallback;
  if (typeof ric === 'function') {
    ric(() => task(), { timeout: timeoutMs });
    return;
  }
  window.setTimeout(task, 1200);
}

/**
 * Prefetch high-probability financial/chart GETs for a few projects.
 * Relies on apiGetCache for dedupe + TTL; does not touch Alerts/DPR/Activity.
 */
export async function prefetchFinancialWarmup(projectName: string): Promise<void> {
  const name = projectName?.trim();
  if (!name) return;

  await Promise.allSettled([
    fetchProjectProgressChart(name),
    costPerformanceApi.getCostPerformance({ project_name: name }),
    budgetPerformanceApi.getBudgetPerformance({ project_name: name }),
    cashflowApi.getCashflow({ project_name: name }),
  ]);
}

/**
 * After dashboard is interactive, warm financial caches during browser idle.
 * Schedules at most once per session key (caller should gate with a ref).
 */
export function scheduleIdleFinancialPrefetch(projectNames: string[]): void {
  const unique = [...new Set(projectNames.map((n) => n.trim()).filter(Boolean))].slice(0, 3);
  if (unique.length === 0) return;

  runWhenIdle(() => {
    void (async () => {
      for (const name of unique) {
        try {
          await prefetchFinancialWarmup(name);
        } catch {
          // Prefetch is best-effort
        }
        // Yield so UI stays responsive between projects
        await new Promise((r) => window.setTimeout(r, 75));
      }
    })();
  });
}
