import type { ProjectDatesRecord } from '../services/api';
import type { BottleneckItem } from './bottleneck';
import type { TeamLeaderOverviewMetrics } from '../components/teamLeader/TeamLeaderOverviewShell';
import type { ExecutiveDecisionItem, ExecutiveProgressPoint } from '../components/pmcHead/PMCExecutiveOverviewPanel';

const CACHE_VERSION = 1;
const CACHE_PREFIX = 'pmc.tl.overview';
/** Display cache TTL — stale entries are discarded */
const TTL_MS = 30 * 60 * 1000;

export interface TeamLeaderOverviewCachePayload {
  v: typeof CACHE_VERSION;
  cachedAt: string;
  projectId: string;
  projectTitle: string;
  projectLocation?: string;
  metrics: TeamLeaderOverviewMetrics;
  progressTrend: ExecutiveProgressPoint[];
  healthSafetySublabel: string;
  sclDates: ProjectDatesRecord | null;
  contractorDates: ProjectDatesRecord | null;
  decisionQueue: ExecutiveDecisionItem[];
  openIssuesCount: number;
}

/** Strip identifiers and bank-guarantee data — chart/timeline fields only */
export function sanitizeProjectDatesForOverviewCache(
  record: ProjectDatesRecord | null | undefined,
): ProjectDatesRecord | null {
  if (!record) return null;
  return {
    date_type: record.date_type,
    project_start: record.project_start ?? null,
    contract_finish: record.contract_finish ?? null,
    forecast_finish: record.forecast_finish ?? null,
    eot_date: record.eot_date ?? null,
    elapsed_duration: record.elapsed_duration ?? 0,
    remaining_duration: record.remaining_duration ?? 0,
    forecast_finish_duration: record.forecast_finish_duration ?? 0,
    eot_duration: record.eot_duration ?? 0,
    delay_days: record.delay_days ?? 0,
    eot_delay_days: record.eot_delay_days ?? 0,
    current_delay: record.current_delay ?? 0,
  };
}

export function buildTeamLeaderOverviewDecisionQueue(
  metrics: TeamLeaderOverviewMetrics,
  healthSafetySublabel: string,
  bottleneckItems: BottleneckItem[],
): ExecutiveDecisionItem[] {
  const criticalRiskItems = bottleneckItems.filter(
    (item) => item.type === 'RISK' && item.status !== 'Closed' && item.description.trim(),
  );

  const items: ExecutiveDecisionItem[] = [];

  criticalRiskItems.slice(0, 2).forEach((item) => {
    items.push({
      id: item.id,
      title: item.description.trim() || 'Critical risk needs review',
      priority: item.priority === 'High' ? 'High' : 'Critical',
      tab: 'risk',
      action: 'Review',
    });
  });

  if (metrics.healthSafetyLabel === 'CRITICAL') {
    items.push({
      id: 'hse',
      title: healthSafetySublabel
        ? `HSE: ${healthSafetySublabel}`
        : 'Health & safety status is critical',
      priority: 'Critical',
      tab: 'risk',
      action: 'Open',
    });
  }

  if (metrics.drawingApprovalPct < 75) {
    items.push({
      id: 'drawing',
      title: `Drawing approval at ${Math.round(metrics.drawingApprovalPct)}%`,
      priority: 'Urgent',
      tab: 'compliance',
      action: 'View',
    });
  }

  if (items.length === 0) {
    items.push({
      id: 'clear',
      title: 'Project overview is up to date — open full view for details',
      priority: 'High',
      tab: 'overview',
    });
  }

  return items;
}

function cacheKey(userId: string, projectId: string): string {
  return `${CACHE_PREFIX}.v${CACHE_VERSION}.${userId}.${projectId}`;
}

export function readTeamLeaderOverviewCache(
  userId: string,
  projectId: string,
): TeamLeaderOverviewCachePayload | null {
  if (!userId || !projectId || typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(cacheKey(userId, projectId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as TeamLeaderOverviewCachePayload;
    if (parsed.v !== CACHE_VERSION || parsed.projectId !== projectId) {
      localStorage.removeItem(cacheKey(userId, projectId));
      return null;
    }

    const age = Date.now() - new Date(parsed.cachedAt).getTime();
    if (!Number.isFinite(age) || age > TTL_MS) {
      localStorage.removeItem(cacheKey(userId, projectId));
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeTeamLeaderOverviewCache(
  userId: string,
  payload: TeamLeaderOverviewCachePayload,
): void {
  if (!userId || !payload.projectId || typeof window === 'undefined') return;

  try {
    localStorage.setItem(cacheKey(userId, payload.projectId), JSON.stringify(payload));
  } catch (error) {
    console.warn('[TL Overview cache] Failed to persist:', error);
  }
}

export function clearTeamLeaderOverviewCache(userId: string, projectId?: string): void {
  if (typeof window === 'undefined' || !userId) return;

  if (projectId) {
    localStorage.removeItem(cacheKey(userId, projectId));
    return;
  }

  const prefix = `${CACHE_PREFIX}.v${CACHE_VERSION}.${userId}.`;
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) localStorage.removeItem(key);
  }
}

/** Remove every team-leader overview cache (e.g. on logout) */
export function clearAllTeamLeaderOverviewCaches(): void {
  if (typeof window === 'undefined') return;

  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${CACHE_PREFIX}.`)) localStorage.removeItem(key);
  }
}

export function buildTeamLeaderOverviewCachePayload(input: {
  projectId: string;
  projectTitle: string;
  projectLocation?: string;
  metrics: TeamLeaderOverviewMetrics;
  progressTrend: ExecutiveProgressPoint[];
  healthSafetySublabel: string;
  sclDates: ProjectDatesRecord | null;
  contractorDates: ProjectDatesRecord | null;
  bottleneckItems: BottleneckItem[];
}): TeamLeaderOverviewCachePayload {
  const openIssuesCount = input.bottleneckItems.filter(
    (item) => item.status !== 'Closed' && item.description.trim(),
  ).length;

  return {
    v: CACHE_VERSION,
    cachedAt: new Date().toISOString(),
    projectId: input.projectId,
    projectTitle: input.projectTitle,
    projectLocation: input.projectLocation,
    metrics: input.metrics,
    progressTrend: input.progressTrend,
    healthSafetySublabel: input.healthSafetySublabel,
    sclDates: sanitizeProjectDatesForOverviewCache(input.sclDates),
    contractorDates: sanitizeProjectDatesForOverviewCache(input.contractorDates),
    decisionQueue: buildTeamLeaderOverviewDecisionQueue(
      input.metrics,
      input.healthSafetySublabel,
      input.bottleneckItems,
    ),
    openIssuesCount,
  };
}
