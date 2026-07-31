import type { ProjectDatesRecord } from '../services/api';
import type { BottleneckItem } from './bottleneck';
import type { TeamLeaderOverviewMetrics } from '../components/teamLeader/TeamLeaderOverviewShell';
import type { ExecutiveDecisionItem, ExecutiveProgressPoint } from '../components/pmcHead/PMCExecutiveOverviewPanel';

/** In-memory / display helpers only — no localStorage (Redis owns API caching). */

export interface TeamLeaderOverviewCachePayload {
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

/** @deprecated No-op readers — localStorage API caches removed. */
export function readTeamLeaderOverviewCache(
  _userId: string,
  _projectId: string,
): TeamLeaderOverviewCachePayload | null {
  return null;
}

/** @deprecated No-op writers — localStorage API caches removed. */
export function writeTeamLeaderOverviewCache(
  _userId: string,
  _payload: TeamLeaderOverviewCachePayload,
): void {}

export function clearTeamLeaderOverviewCache(_userId: string, _projectId?: string): void {
  clearAllTeamLeaderOverviewCaches();
}

/** Purge legacy browser caches from older app versions. */
export function clearAllTeamLeaderOverviewCaches(): void {
  if (typeof window === 'undefined') return;
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key?.startsWith('pmc.tl.overview.')) localStorage.removeItem(key);
  }
}
