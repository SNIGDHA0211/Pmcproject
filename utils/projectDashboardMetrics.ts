import type { ProjectProgressChartPoint } from './projectProgress';
import type { ProjectDatesByProject } from '../services/api';
import { getContractorsList, maxContractorDelay } from './projectDatesMulti';
import type { BottleneckItem } from './bottleneck';
import {
  getHealthSafetyStatus,
  toIncidentMetrics,
  type IncidentMetrics,
} from './healthSafety';

export type ProjectHealthTone = 'good' | 'warn' | 'bad';

export interface ProjectDashboardMetrics {
  overallProgressPct: number;
  delayDays: number | null;
  criticalRisks: number;
  drawingApprovalPct: number;
  projectHealth: { label: string; sublabel: string; tone: ProjectHealthTone };
  healthSafetyStatus: {
    label: 'SAFE' | 'WARNING' | 'CRITICAL';
    level: 'safe' | 'warning' | 'critical';
    sublabel: string;
  };
  budgetPct: number | null;
  budgetNote: string;
  manpowerPct: number | null;
  manpowerNote: string;
  dprCount: number;
}

export interface ProjectMetricsInput {
  progressChart: ProjectProgressChartPoint[];
  projectDatesBundle: ProjectDatesByProject | null;
  costPerformanceRows: Array<{ bcws?: number; bcwp?: number; acwp?: number }>;
  manpowerRows: Array<{ planned?: number; actual?: number; planned_manpower?: number; actual_manpower?: number }>;
  hseMetrics: IncidentMetrics | null;
  hasHseData: boolean;
  bottleneckItems: BottleneckItem[];
  drawingApprovalRate: number | null;
  hasDrawingData: boolean;
  dashboardData: Record<string, unknown> | null;
  plannedEarnedScl: {
    plannedValue?: number;
    earnedValue?: number;
    performancePercentage?: number;
  } | null;
  dprCount: number;
}

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const pctOf = (num: number, den: number): number | null =>
  den > 0 && Number.isFinite(num) && Number.isFinite(den) ? (num / den) * 100 : null;

/** Same rules as Projects.tsx → ProjectDashboardSummary */
export function computeProjectDashboardMetrics(
  input: ProjectMetricsInput,
): ProjectDashboardMetrics {
  const {
    progressChart,
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
  } = input;

  const lastCostRow =
    costPerformanceRows.length > 0 ? costPerformanceRows[costPerformanceRows.length - 1] : null;

  const plannedValue =
    plannedEarnedScl?.plannedValue ??
    toNum(dashboardData?.planned_value) ??
    toNum(lastCostRow?.bcws);
  const earnedValue =
    plannedEarnedScl?.earnedValue ?? toNum(dashboardData?.earned_value);
  const earnedPercentOfPlanned =
    plannedEarnedScl?.performancePercentage ??
    (plannedValue > 0 ? (earnedValue / plannedValue) * 100 : null);

  const bcwp = toNum(dashboardData?.bcwp) || toNum(lastCostRow?.bcwp);
  const ac = toNum(dashboardData?.ac) || toNum(lastCostRow?.acwp);

  const contractors = getContractorsList(projectDatesBundle);

  const summaryDelayDays = Math.max(
    Math.abs(toNum(projectDatesBundle?.scl?.current_delay ?? projectDatesBundle?.scl?.delay_days)),
    maxContractorDelay(contractors),
  );

  const hasDelayData = Boolean(projectDatesBundle?.scl || contractors.length > 0);

  const lastProgressPoint =
    progressChart.length > 0 ? progressChart[progressChart.length - 1] : null;

  let overallProgressPct = 0;
  if (lastProgressPoint != null) {
    overallProgressPct = Math.round(
      Math.min(
        100,
        Math.max(
          0,
          Number(lastProgressPoint.cumulativeActual ?? lastProgressPoint.actual ?? 0),
        ),
      ),
    );
  } else if (earnedPercentOfPlanned != null) {
    overallProgressPct = Math.round(Math.min(100, Math.max(0, earnedPercentOfPlanned)));
  }

  const cpiPct = pctOf(bcwp, ac);
  let budgetPct: number | null = null;
  let budgetNote = 'No cost data';
  if (cpiPct != null && (bcwp > 0 || ac > 0)) {
    budgetPct = Math.round(Math.min(100, Math.max(0, cpiPct)));
    budgetNote =
      cpiPct >= 100
        ? 'Cost performance on track'
        : cpiPct >= 90
          ? 'Slight cost variance'
          : 'Cost overrun risk';
  }

  let manpowerPct: number | null = null;
  let manpowerNote = 'No manpower data';
  if (manpowerRows.length > 0) {
    const latest = manpowerRows[manpowerRows.length - 1];
    const planned = toNum(latest.planned ?? latest.planned_manpower);
    const actual = toNum(latest.actual ?? latest.actual_manpower);
    if (planned > 0) {
      manpowerPct = Math.round(Math.min(100, Math.max(0, (actual / planned) * 100)));
      const gap = actual - planned;
      manpowerNote =
        gap === 0 ? 'On plan' : gap > 0 ? `${gap} over plan` : `${Math.abs(gap)} short`;
    } else if (actual > 0) {
      manpowerNote = `${actual} on site`;
    }
  }

  const safetyStats = hseMetrics ?? {
    fatalities: toNum(dashboardData?.fatalities),
    significant: toNum(dashboardData?.significant),
    major: toNum(dashboardData?.major),
    minor: toNum(dashboardData?.minor),
    nearMiss: toNum(dashboardData?.near_miss),
  };

  const resolvedHasHseData = hasHseData || Boolean(dashboardData);

  const hseBadge = getHealthSafetyStatus(safetyStats);
  const healthSafetyStatus = {
    label: hseBadge.label,
    level: hseBadge.level,
    sublabel: (() => {
      const { fatalities, minor, nearMiss, major, significant } = safetyStats;
      if (!resolvedHasHseData) return 'No HSE data';
      if (fatalities > 0) {
        return `${fatalities} ${fatalities === 1 ? 'fatality' : 'fatalities'} YTD`;
      }
      if (major > 0 || significant > 0) {
        return `${major + significant} major/significant YTD`;
      }
      if (minor > 0) {
        return `${minor} minor incident${minor === 1 ? '' : 's'} YTD`;
      }
      if (nearMiss > 0) {
        return `${nearMiss} near miss${nearMiss === 1 ? '' : 'es'} YTD`;
      }
      return 'No reportable incidents YTD';
    })(),
  };

  const criticalRisks = bottleneckItems.filter(
    (item) => item.type === 'RISK' && item.status !== 'Closed' && item.description.trim(),
  ).length;

  const projectHealth = (() => {
    if (safetyStats.fatalities > 0 || safetyStats.major >= 3) {
      return { label: 'Critical', sublabel: 'Requires immediate attention', tone: 'bad' as const };
    }
    if (safetyStats.major > 0 || safetyStats.significant > 0 || summaryDelayDays > 60) {
      return { label: 'At Risk', sublabel: 'Monitor key indicators', tone: 'warn' as const };
    }
    return { label: 'Good', sublabel: 'All systems normal', tone: 'good' as const };
  })();

  return {
    overallProgressPct,
    delayDays: hasDelayData ? summaryDelayDays : null,
    criticalRisks,
    drawingApprovalPct: hasDrawingData ? Math.round(drawingApprovalRate ?? 0) : 0,
    projectHealth,
    healthSafetyStatus,
    budgetPct,
    budgetNote,
    manpowerPct,
    manpowerNote,
    dprCount,
  };
};

export function hseLevelToPercent(
  level: 'safe' | 'warning' | 'critical',
  hasData: boolean,
): number | null {
  if (!hasData) return null;
  if (level === 'safe') return 100;
  if (level === 'warning') return 55;
  return 15;
};

export function healthToneToLabel(tone: ProjectHealthTone): 'ON TRACK' | 'AT RISK' | 'CRITICAL' {
  if (tone === 'bad') return 'CRITICAL';
  if (tone === 'warn') return 'AT RISK';
  return 'ON TRACK';
}

export function computeOverallScoreFromMetrics(metrics: ProjectDashboardMetrics): number | null {
  const values: number[] = [];
  if (metrics.overallProgressPct != null) values.push(metrics.overallProgressPct);
  if (metrics.budgetPct != null) values.push(metrics.budgetPct);
  if (metrics.manpowerPct != null) values.push(metrics.manpowerPct);
  const safetyPct = hseLevelToPercent(
    metrics.healthSafetyStatus.level,
    metrics.healthSafetyStatus.sublabel !== 'No HSE data',
  );
  if (safetyPct != null) values.push(safetyPct);
  values.push(metrics.drawingApprovalPct);

  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}
