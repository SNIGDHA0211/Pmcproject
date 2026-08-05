import { DPR, Project } from '../types';
import {
  projectApi,
  projectDatesApi,
  projectProgressApi,
  drawingRegisterApi,
  normalizeProjectDatesByProject,
  toNum,
  type ProjectDatesByProject,
} from './api';
import {
  computeProjectDashboardMetrics,
  type ProjectDashboardMetrics,
  type ProjectMetricsInput,
} from '../utils/projectDashboardMetrics';
import {
  mapProjectProgressToChartPoints,
  unwrapProjectProgressList,
  type ProjectProgressChartPoint,
} from '../utils/projectProgress';
import {
  isSyntheticExecutiveProjectId,
  resolveExecutiveProjectForApi,
} from '../utils/pmcHeadExecutiveProjects';
import { projectApiName } from '../utils/hseSiteEngineerProjects';

export interface ProjectVitalsSnapshot {
  projectId: string;
  title: string;
  location: string;
  pmName: string;
  client: string;
  updatedAt: string;
  metrics: ProjectDashboardMetrics;
}

/** Parallel dashboard fetches — dates are optional second pass (many 404s). */
const DASHBOARD_CONCURRENCY = 6;
const DATES_CONCURRENCY = 4;

type VitalsExtras = {
  progressChart?: ProjectProgressChartPoint[];
  drawingApprovalRate?: number | null;
  hasDrawingData?: boolean;
};

const dprsForProject = (project: Project, dprs: DPR[]) =>
  dprs.filter((d) => d.projectId === project.id || d.projectName === project.title);

function isUnresolvedStubProject(project: Project): boolean {
  return isSyntheticExecutiveProjectId(project.id);
}

function dashboardDataFromProject(project: Project): Record<string, unknown> {
  return {
    planned_value: project.plannedValue,
    earned_value: project.earnedValue,
    ac: project.actualCost,
    bcwp: project.earnedValue,
    gross_billed: project.grossBilled,
    net_billed: project.netBilled,
    net_collected: project.netCollected,
    fatalities: project.fatalities,
    significant: project.significant,
    major: project.major,
    minor: project.minor,
    near_miss: project.nearMiss,
    total_manhours: project.totalManhours,
  };
}

function hasSeedHseData(project: Project): boolean {
  return (
    toNum(project.fatalities) +
      toNum(project.significant) +
      toNum(project.major) +
      toNum(project.minor) +
      toNum(project.nearMiss) >
    0
  );
}

/** Pull drawing / progress hints if dashboard-data already includes them. */
function extrasFromDashboard(dashboardData: Record<string, unknown>): VitalsExtras {
  const approval = toNum(
    dashboardData.drawing_approval_pct ??
      dashboardData.drawing_approval_rate ??
      dashboardData.approval_rate ??
      dashboardData.drawingApprovalPct,
  );
  const hasDrawingHint =
    dashboardData.drawing_approval_pct != null ||
    dashboardData.drawing_approval_rate != null ||
    dashboardData.approval_rate != null ||
    dashboardData.drawingApprovalPct != null ||
    dashboardData.has_drawing_data === true;

  const progressHint = toNum(
    dashboardData.overall_progress ??
      dashboardData.overall_progress_pct ??
      dashboardData.progress_pct ??
      dashboardData.cumulative_actual,
  );

  const progressChart: ProjectProgressChartPoint[] =
    progressHint > 0
      ? [
          {
            month: 'Latest',
            monthlyPlanned: 0,
            monthlyActual: 0,
            planned: progressHint,
            actual: progressHint,
            cumulativePlanned: progressHint,
            cumulativeActual: progressHint,
            difference: 0,
            sortKey: Date.now(),
          },
        ]
      : [];

  return {
    progressChart,
    drawingApprovalRate: hasDrawingHint ? approval : null,
    hasDrawingData: hasDrawingHint,
  };
}

function metricsInputFromDashboard(
  project: Project,
  dprs: DPR[],
  dashboardData: Record<string, unknown>,
  projectDatesBundle: ProjectDatesByProject | null = null,
  extras: VitalsExtras = {},
): ProjectMetricsInput {
  const dprCount = dprsForProject(project, dprs).length;
  const planned = toNum(dashboardData.planned_value ?? project.plannedValue);
  const earned = toNum(dashboardData.earned_value ?? project.earnedValue);
  const fromDash = extrasFromDashboard(dashboardData);

  const progressChart =
    extras.progressChart && extras.progressChart.length > 0
      ? extras.progressChart
      : fromDash.progressChart ?? [];

  const hasDrawingData =
    extras.hasDrawingData === true || fromDash.hasDrawingData === true;
  const drawingApprovalRate = hasDrawingData
    ? (extras.drawingApprovalRate ?? fromDash.drawingApprovalRate ?? null)
    : null;

  return {
    progressChart,
    projectDatesBundle,
    costPerformanceRows: [
      {
        bcws: toNum(dashboardData.bcws),
        bcwp: toNum(dashboardData.bcwp ?? dashboardData.earned_value),
        acwp: toNum(dashboardData.ac ?? dashboardData.acwp),
      },
    ],
    manpowerRows: [],
    hseMetrics: null,
    hasHseData: hasSeedHseData(project),
    bottleneckItems: [],
    drawingApprovalRate,
    hasDrawingData,
    dashboardData,
    plannedEarnedScl:
      planned > 0
        ? {
            plannedValue: planned,
            earnedValue: earned,
            performancePercentage: planned > 0 ? (earned / planned) * 100 : undefined,
          }
        : null,
    dprCount,
  };
}

function snapshotFromMetrics(
  project: Project,
  metrics: ProjectDashboardMetrics,
): ProjectVitalsSnapshot {
  return {
    projectId: project.id,
    title: project.title,
    location: project.location || '—',
    pmName: project.teamLeadName || 'Unassigned',
    client: project.client || '',
    updatedAt: project.updatedAt,
    metrics,
  };
}

export function buildSeedVitalsSnapshot(project: Project, dprs: DPR[]): ProjectVitalsSnapshot {
  const resolved = resolveExecutiveProjectForApi(project);
  const metrics = computeProjectDashboardMetrics(
    metricsInputFromDashboard(resolved, dprs, dashboardDataFromProject(resolved)),
  );
  return snapshotFromMetrics(resolved, metrics);
}

function isNotFoundError(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 410;
}

async function safeGetDashboardData(
  projectId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const response = await projectApi.getDashboardData(projectId);
    const payload = response.data;
    if (payload && typeof payload === 'object') {
      return payload as Record<string, unknown>;
    }
    return null;
  } catch (error) {
    if (!isNotFoundError(error)) {
      console.warn(`[vitals] dashboard-data failed for ${projectId}`, error);
    }
    return null;
  }
}

async function safeGetProjectDates(
  projectName: string,
): Promise<ProjectDatesByProject | null> {
  try {
    const response = await projectDatesApi.getByProject(projectName);
    return normalizeProjectDatesByProject(response.data, projectName);
  } catch (error) {
    if (!isNotFoundError(error)) {
      console.warn(`[vitals] project-dates failed for ${projectName}`, error);
    }
    return null;
  }
}

/** Same source as project detail / site engineer Progress %. */
async function safeGetProgressChart(
  projectName: string,
): Promise<ProjectProgressChartPoint[]> {
  try {
    const response = await projectProgressApi.getProjectProgress({
      project_name: projectName,
    });
    return mapProjectProgressToChartPoints(
      unwrapProjectProgressList(response.data),
      projectName,
    );
  } catch (error) {
    if (!isNotFoundError(error)) {
      console.warn(`[vitals] project-progress failed for ${projectName}`, error);
    }
    return [];
  }
}

/** Drawing approval % for Quality cell (same register as Compliance tab). */
async function safeGetDrawingApproval(
  projectName: string,
): Promise<{ rate: number; hasData: boolean }> {
  const now = new Date();
  try {
    const response = await drawingRegisterApi.getClientReport({
      projectName,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      view: 'cumulative',
    });
    const summary = response.data?.summary;
    if (!summary) return { rate: 0, hasData: false };
    const rate = toNum(summary.approvalRate);
    const hasData =
      toNum(summary.submittedDrawings) > 0 ||
      toNum(summary.approvedDrawings) > 0 ||
      rate > 0;
    return { rate, hasData };
  } catch (error) {
    if (!isNotFoundError(error)) {
      console.warn(`[vitals] drawings failed for ${projectName}`, error);
    }
    return { rate: 0, hasData: false };
  }
}

function needsScheduleDatesRefresh(metrics: ProjectDashboardMetrics): boolean {
  return metrics.delayDays == null && metrics.overallProgressPct <= 0;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runWorker = async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) break;
      results[index] = await worker(items[index], index);
    }
  };

  const poolSize = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: poolSize }, () => runWorker()));
  return results;
}

type LiveBundle = {
  dashboard: Record<string, unknown>;
  extras: VitalsExtras;
};

/**
 * Instant cards from list + DPR data, then parallel live refresh:
 * dashboard + project progress + drawings (same sources as project detail).
 */
export async function loadProjectVitalsProgressively(
  projects: Project[],
  dprs: DPR[],
  onProgress?: (
    snapshots: ProjectVitalsSnapshot[],
    meta?: { completed: number; total: number },
  ) => void,
): Promise<ProjectVitalsSnapshot[]> {
  const resolvedProjects = projects.map(resolveExecutiveProjectForApi);

  const realIndices: number[] = [];
  resolvedProjects.forEach((project, index) => {
    if (!isUnresolvedStubProject(project)) {
      realIndices.push(index);
    }
  });

  const snapshots = resolvedProjects.map((project) => buildSeedVitalsSnapshot(project, dprs));
  onProgress?.([...snapshots], { completed: 0, total: realIndices.length });

  if (realIndices.length === 0) {
    return snapshots;
  }

  const liveByIndex = new Map<number, LiveBundle>();
  let dashboardCompleted = 0;

  await mapPool(realIndices, DASHBOARD_CONCURRENCY, async (index) => {
    const project = resolvedProjects[index];
    const seedDashboard = dashboardDataFromProject(project);

    const [payload, progressChart, drawings] = await Promise.all([
      safeGetDashboardData(project.id),
      safeGetProgressChart(projectApiName(project)),
      safeGetDrawingApproval(projectApiName(project)),
    ]);

    const merged = payload ? { ...seedDashboard, ...payload } : seedDashboard;
    const extras: VitalsExtras = {
      progressChart,
      drawingApprovalRate: drawings.hasData ? drawings.rate : null,
      hasDrawingData: drawings.hasData,
    };

    liveByIndex.set(index, { dashboard: merged, extras });

    snapshots[index] = snapshotFromMetrics(
      project,
      computeProjectDashboardMetrics(
        metricsInputFromDashboard(project, dprs, merged, null, extras),
      ),
    );
    dashboardCompleted += 1;
    onProgress?.([...snapshots], {
      completed: dashboardCompleted,
      total: realIndices.length,
    });
  });

  const datesIndices = realIndices.filter((index) =>
    needsScheduleDatesRefresh(snapshots[index].metrics),
  );

  if (datesIndices.length > 0) {
    const datesByIndex = new Map<number, ProjectDatesByProject | null>();

    await mapPool(datesIndices, DATES_CONCURRENCY, async (index) => {
      const project = resolvedProjects[index];
      datesByIndex.set(index, await safeGetProjectDates(projectApiName(project)));
    });

    datesIndices.forEach((index) => {
      const project = resolvedProjects[index];
      const live =
        liveByIndex.get(index) ??
        ({
          dashboard: dashboardDataFromProject(project),
          extras: {},
        } satisfies LiveBundle);
      snapshots[index] = snapshotFromMetrics(
        project,
        computeProjectDashboardMetrics(
          metricsInputFromDashboard(
            project,
            dprs,
            live.dashboard,
            datesByIndex.get(index) ?? null,
            live.extras,
          ),
        ),
      );
    });
    onProgress?.([...snapshots], {
      completed: realIndices.length,
      total: realIndices.length,
    });
  }

  return snapshots;
}

/** @deprecated Prefer loadProjectVitalsProgressively — kept for compatibility. */
export async function fetchAllProjectVitalsSnapshots(
  projects: Project[],
  dprs: DPR[],
  _role: string,
): Promise<ProjectVitalsSnapshot[]> {
  return loadProjectVitalsProgressively(projects, dprs);
}
