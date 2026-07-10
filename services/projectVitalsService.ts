import { DPR, Project } from '../types';
import {
  projectApi,
  projectDatesApi,
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
  isSyntheticExecutiveProjectId,
  resolveExecutiveProjectForApi,
} from '../utils/pmcHeadExecutiveProjects';

export interface ProjectVitalsSnapshot {
  projectId: string;
  title: string;
  location: string;
  pmName: string;
  updatedAt: string;
  metrics: ProjectDashboardMetrics;
}

/** Parallel dashboard fetches — dates are optional second pass (many 404s). */
const DASHBOARD_CONCURRENCY = 6;
const DATES_CONCURRENCY = 4;

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

function metricsInputFromDashboard(
  project: Project,
  dprs: DPR[],
  dashboardData: Record<string, unknown>,
  projectDatesBundle: ProjectDatesByProject | null = null,
): ProjectMetricsInput {
  const dprCount = dprsForProject(project, dprs).length;
  const planned = toNum(dashboardData.planned_value ?? project.plannedValue);
  const earned = toNum(dashboardData.earned_value ?? project.earnedValue);

  return {
    progressChart: [],
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
    hasHseData: hasSeedHseData(project) || Object.keys(dashboardData).length > 0,
    bottleneckItems: [],
    drawingApprovalRate: null,
    hasDrawingData: false,
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

function needsScheduleDatesRefresh(metrics: ProjectDashboardMetrics): boolean {
  return metrics.delayDays == null && metrics.overallProgressPct <= 0;
}

async function fetchProjectVitalsSnapshotLite(
  project: Project,
  dprs: DPR[],
  datesBundle: ProjectDatesByProject | null,
): Promise<ProjectVitalsSnapshot> {
  const resolved = resolveExecutiveProjectForApi(project);
  if (isUnresolvedStubProject(resolved)) {
    return buildSeedVitalsSnapshot(project, dprs);
  }

  const seedDashboard = dashboardDataFromProject(resolved);
  const dashboardPayload = await safeGetDashboardData(resolved.id);
  const mergedDashboard = dashboardPayload
    ? { ...seedDashboard, ...dashboardPayload }
    : seedDashboard;

  let projectDatesBundle = datesBundle;
  const metricsWithoutDates = computeProjectDashboardMetrics(
    metricsInputFromDashboard(resolved, dprs, mergedDashboard, projectDatesBundle),
  );

  if (!projectDatesBundle && needsScheduleDatesRefresh(metricsWithoutDates)) {
    projectDatesBundle = await safeGetProjectDates(resolved.title);
  }

  const metrics = computeProjectDashboardMetrics(
    metricsInputFromDashboard(resolved, dprs, mergedDashboard, projectDatesBundle),
  );

  return snapshotFromMetrics(resolved, metrics);
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

/**
 * Instant cards from list + DPR data, then parallel dashboard refresh (dates only when needed).
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

  const dashboardByIndex = new Map<number, Record<string, unknown> | null>();
  let dashboardCompleted = 0;

  await mapPool(realIndices, DASHBOARD_CONCURRENCY, async (index) => {
    const project = resolvedProjects[index];
    const seedDashboard = dashboardDataFromProject(project);
    const payload = await safeGetDashboardData(project.id);
    dashboardByIndex.set(
      index,
      payload ? { ...seedDashboard, ...payload } : seedDashboard,
    );

    const merged = dashboardByIndex.get(index) ?? seedDashboard;
    snapshots[index] = snapshotFromMetrics(
      project,
      computeProjectDashboardMetrics(
        metricsInputFromDashboard(project, dprs, merged, null),
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
      datesByIndex.set(index, await safeGetProjectDates(project.title));
    });

    datesIndices.forEach((index) => {
      const project = resolvedProjects[index];
      const merged =
        dashboardByIndex.get(index) ?? dashboardDataFromProject(project);
      snapshots[index] = snapshotFromMetrics(
        project,
        computeProjectDashboardMetrics(
          metricsInputFromDashboard(
            project,
            dprs,
            merged,
            datesByIndex.get(index) ?? null,
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
