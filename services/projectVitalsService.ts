import { DPR, Project } from '../types';
import {
  costPerformanceApi,
  drawingRegisterApi,
  fetchHealthSafetyDashboardFallback,
  manpowerApi,
  normalizeManpowerRecord,
  normalizePlannedEarnedByPeriod,
  normalizeProjectDatesByProject,
  plannedEarnedValueApi,
  projectApi,
  projectDatesApi,
  projectLogsApi,
  toNum,
  unwrapList,
} from './api';
import { fetchProjectProgressChart } from './financialDataService';
import { parseBottleneckFromProjectLogEntries } from '../utils/bottleneck';
import {
  computeProjectDashboardMetrics,
  type ProjectDashboardMetrics,
  type ProjectMetricsInput,
} from '../utils/projectDashboardMetrics';
import { toIncidentMetrics } from '../utils/healthSafety';

export interface ProjectVitalsSnapshot {
  projectId: string;
  title: string;
  location: string;
  pmName: string;
  updatedAt: string;
  metrics: ProjectDashboardMetrics;
}

const dprsForProject = (project: Project, dprs: DPR[]) =>
  dprs.filter((d) => d.projectId === project.id || d.projectName === project.title);

export async function fetchProjectVitalsSnapshot(
  project: Project,
  dprs: DPR[],
  role: string,
): Promise<ProjectVitalsSnapshot> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const projectName = project.title;
  const dprCount = dprsForProject(project, dprs).length;

  const [
    progressChart,
    datesResult,
    costResult,
    manpowerResult,
    hseResult,
    logsResult,
    drawingsResult,
    dashboardResult,
    pevResult,
  ] = await Promise.allSettled([
    fetchProjectProgressChart(projectName, role),
    projectDatesApi.getByProject(projectName),
    costPerformanceApi.getCostPerformance({
      project_name: projectName,
      ...(role ? { role } : {}),
    }),
    manpowerApi.getManpower({ project_name: projectName }),
    fetchHealthSafetyDashboardFallback(projectName, month, year),
    projectLogsApi.getProjectLogs(project.id),
    drawingRegisterApi.getClientReport({
      projectName,
      month,
      year,
      view: 'monthly',
    }),
    projectApi.getDashboardData(project.id),
    plannedEarnedValueApi.getByProjectMonthYear(projectName, month, year),
  ]);

  const progressChartData =
    progressChart.status === 'fulfilled' ? progressChart.value : [];

  let projectDatesBundle = null;
  if (datesResult.status === 'fulfilled') {
    projectDatesBundle = normalizeProjectDatesByProject(datesResult.value.data, projectName);
  }

  const costPerformanceRows =
    costResult.status === 'fulfilled'
      ? unwrapList<any>(costResult.value.data).map((item: any) => ({
          bcws: toNum(item.bcws),
          bcwp: toNum(item.bcwp),
          acwp: toNum(item.acwp),
        }))
      : [];

  const manpowerRows =
    manpowerResult.status === 'fulfilled'
      ? unwrapList<any>(manpowerResult.value.data)
          .map((item: any) => {
            const row = normalizeManpowerRecord(item);
            return {
              month: row.month_year as string,
              planned: row.planned_manpower,
              actual: row.actual_manpower,
            };
          })
          .sort((a, b) => {
            const dateA = new Date('1-' + a.month);
            const dateB = new Date('1-' + b.month);
            return dateA.getTime() - dateB.getTime();
          })
      : [];

  let hseMetrics = null;
  let hasHseData = false;
  if (hseResult.status === 'fulfilled') {
    const dashboard = hseResult.value;
    const current =
      dashboard.currentMonth ??
      dashboard.monthlyRecords.find((row) => row.month === month && row.year === year) ??
      null;
    if (current) {
      hasHseData = true;
      hseMetrics = toIncidentMetrics(current);
    } else if (dashboard.ytdSummary) {
      hasHseData = true;
      hseMetrics = toIncidentMetrics(dashboard.ytdSummary);
    }
  }

  const dashboardData =
    dashboardResult.status === 'fulfilled'
      ? (dashboardResult.value.data as Record<string, unknown>)
      : null;

  if (!hasHseData && dashboardData) {
    hasHseData = true;
  }

  let bottleneckItems: ReturnType<typeof parseBottleneckFromProjectLogEntries> = [];
  if (logsResult.status === 'fulfilled') {
    const entries: unknown[] = logsResult.value.data?.entries || [];
    bottleneckItems = parseBottleneckFromProjectLogEntries(entries);
  }

  let drawingApprovalRate: number | null = null;
  let hasDrawingData = false;
  if (drawingsResult.status === 'fulfilled') {
    const summary = drawingsResult.value.data?.summary;
    if (summary && typeof summary.approvalRate === 'number') {
      hasDrawingData = true;
      drawingApprovalRate = summary.approvalRate;
    }
  }

  let plannedEarnedScl: ProjectMetricsInput['plannedEarnedScl'] = null;
  if (pevResult.status === 'fulfilled') {
    const period = normalizePlannedEarnedByPeriod(pevResult.value.data, projectName);
    if (period.scl) {
      plannedEarnedScl = {
        plannedValue: toNum(period.scl.plannedValue),
        earnedValue: toNum(period.scl.earnedValue),
        performancePercentage: period.scl.performancePercentage,
      };
    }
  }

  const metrics = computeProjectDashboardMetrics({
    progressChart: progressChartData,
    projectDatesBundle,
    costPerformanceRows,
    manpowerRows,
    hseMetrics,
    hasHseData,
    bottleneckItems,
    drawingApprovalRate,
    hasDrawingData,
    dashboardData,
    plannedEarnedScl,
    dprCount,
  });

  return {
    projectId: project.id,
    title: project.title,
    location: project.location || '—',
    pmName: project.teamLeadName || 'Unassigned',
    updatedAt: project.updatedAt,
    metrics,
  };
}

export async function fetchAllProjectVitalsSnapshots(
  projects: Project[],
  dprs: DPR[],
  role: string,
): Promise<ProjectVitalsSnapshot[]> {
  return Promise.all(projects.map((project) => fetchProjectVitalsSnapshot(project, dprs, role)));
}
