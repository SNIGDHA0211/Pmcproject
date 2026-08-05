import type { ProjectDashboardMetrics } from './projectDashboardMetrics';
import {
  computeCompliancePct,
  computeOverallScoreFromMetrics,
  computeScheduleHealthPct,
  hseLevelToPercent,
} from './projectDashboardMetrics';
import type { ProjectVitalsSnapshot } from '../services/projectVitalsService';

export type VitalStatus = 'healthy' | 'watch' | 'critical' | 'unknown';
/** Card-level health from overview `project_status` (or derived fallback). */
export type HealthLabel =
  | 'ON TRACK'
  | 'WATCH'
  | 'AT RISK'
  | 'CRITICAL'
  | 'COMPLETED'
  | 'NO DATA';
export type TrendDirection = 'improving' | 'stable' | 'declining';

export type VitalKey = 'schedule' | 'budget' | 'manpower' | 'safety' | 'reports' | 'drawings' | 'compliance';

export interface ProjectVital {
  key: VitalKey;
  label: string;
  percent: number | null;
  status: VitalStatus;
  /** Backend KPI label when provided (e.g. Delay / Watch / Excellent) — shown as-is. */
  statusLabel?: string;
  note: string;
}

export interface ProjectVitalsCard {
  projectId: string;
  title: string;
  location: string;
  pmName: string;
  client: string;
  overallScore: number | null;
  healthLabel: HealthLabel;
  /** Exact overview `project_status` string when provided (e.g. "On Track"). */
  projectStatusLabel?: string;
  /** DB lifecycle from overview `status` (active | completed | planning | …). */
  lifecycleStatus?: string | null;
  progressPct: number | null;
  /** Backend progress.status when provided. */
  progressStatusLabel?: string;
  openIssues: number;
  dprCount: number;
  drawingApprovalPct: number | null;
  vitals: ProjectVital[];
  trend: TrendDirection;
  lastUpdate: string;
  /** From overview API — when false, compare control is disabled. */
  compareEnabled?: boolean;
  /** Project completion metadata from overview / portfolio. */
  isCompleted?: boolean;
  completedAt?: string | null;
  completedBy?: string | null;
  billingStatus?: string | null;
  billingCompletedAt?: string | null;
  billingCompletedBy?: string | null;
  billingCompletionNotes?: string | null;
}

const statusFromPercent = (percent: number | null, criticalBelow = 50, watchBelow = 75): VitalStatus => {
  if (percent == null) return 'unknown';
  if (percent < criticalBelow) return 'critical';
  if (percent < watchBelow) return 'watch';
  return 'healthy';
};

const formatRelativeUpdate = (iso?: string): string => {
  if (!iso) return 'No recent update';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Updated today';
  if (days === 1) return 'Last update: 1 day ago';
  return `Last update: ${days} days ago`;
};

export const buildProjectVitalsCardFromSnapshot = (
  snapshot: ProjectVitalsSnapshot,
): ProjectVitalsCard => {
  const m: ProjectDashboardMetrics = snapshot.metrics;
  const hasHseData = m.healthSafetyStatus.sublabel !== 'No HSE data';
  const safetyPct = hseLevelToPercent(m.healthSafetyStatus.level, hasHseData);

  const schedulePct = computeScheduleHealthPct(m);
  const compliancePct = computeCompliancePct(m);

  const scheduleNote =
    m.delayDays != null && m.delayDays > 0
      ? `${m.delayDays} days behind`
      : schedulePct != null && schedulePct >= 80
        ? 'On schedule'
        : m.overallProgressPct > 0
          ? `${m.overallProgressPct}% physical progress`
          : 'No schedule data';

  const reportsNote =
    m.dprCount > 0 ? `${m.dprCount} DPR logged` : 'No DPR data';

  const complianceNote =
    compliancePct == null
      ? 'No compliance data'
      : m.drawingApprovalPct > 0 && m.dprCount > 0
        ? 'Drawings & DPR active'
        : m.drawingApprovalPct > 0
          ? 'Drawing register tracked'
          : 'DPR reporting active';

  const vitals: ProjectVital[] = [
    {
      key: 'schedule',
      label: 'Schedule',
      percent: schedulePct,
      status: statusFromPercent(schedulePct),
      note: scheduleNote,
    },
    {
      key: 'budget',
      label: 'Budget',
      percent: m.budgetPct,
      status: statusFromPercent(m.budgetPct),
      note: m.budgetNote,
    },
    {
      key: 'manpower',
      label: 'Manpower',
      percent: m.manpowerPct,
      status: statusFromPercent(m.manpowerPct, 45, 70),
      note: m.manpowerNote,
    },
    {
      key: 'safety',
      label: 'Safety',
      percent: safetyPct,
      status: statusFromPercent(safetyPct, 60, 85),
      note: hasHseData ? m.healthSafetyStatus.label : 'No HSE data',
    },
    {
      key: 'reports',
      label: 'Reports',
      percent: null,
      status: m.dprCount > 0 ? 'healthy' : 'unknown',
      note: reportsNote,
    },
    {
      key: 'drawings',
      label: 'Drawings',
      percent: m.drawingApprovalPct > 0 ? m.drawingApprovalPct : null,
      status: statusFromPercent(m.drawingApprovalPct > 0 ? m.drawingApprovalPct : null, 55, 80),
      note:
        m.drawingApprovalPct >= 75
          ? 'On track'
          : m.drawingApprovalPct > 0
            ? 'Needs improvement'
            : 'No drawing data',
    },
    {
      key: 'compliance',
      label: 'Compliance',
      percent: compliancePct,
      status: statusFromPercent(compliancePct, 55, 80),
      note: complianceNote,
    },
  ];

  const overallScore = computeOverallScoreFromMetrics(m);
  const healthLabel: HealthLabel =
    m.projectHealth.label === 'Critical'
      ? 'CRITICAL'
      : m.projectHealth.label === 'At Risk'
        ? 'AT RISK'
        : 'ON TRACK';

  const trend: TrendDirection =
    overallScore == null
      ? 'stable'
      : overallScore >= 80
        ? 'improving'
        : overallScore >= 60
          ? 'stable'
          : 'declining';

  return {
    projectId: snapshot.projectId,
    title: snapshot.title,
    location: snapshot.location,
    pmName: snapshot.pmName,
    client: snapshot.client?.trim() || extractClientFromTitle(snapshot.title),
    overallScore,
    healthLabel,
    progressPct: m.overallProgressPct > 0 ? m.overallProgressPct : null,
    openIssues: Math.max(0, m.criticalRisks),
    dprCount: Math.max(0, m.dprCount),
    drawingApprovalPct: m.drawingApprovalPct > 0 ? m.drawingApprovalPct : null,
    vitals,
    trend,
    lastUpdate: formatRelativeUpdate(snapshot.updatedAt),
  };
};

/** Pull client acronym from titles like "G3 Building – Girgaon (MMRCL)". */
function extractClientFromTitle(title: string): string {
  const match = title.match(/\(([^)]+)\)\s*$/);
  if (match?.[1]) return match[1].trim();
  return '—';
}

export interface PortfolioSummary {
  portfolioScore: number | null;
  scheduleHealth: number | null;
  financialHealth: number | null;
  compliance: number | null;
  safetyIndex: number | null;
  projectsWithScore: number;
  projectsTotal: number;
}

export const PORTFOLIO_SCORE_FORMULAS = {
  portfolioScore:
    'Average of each project’s overall score (mean of Schedule, Financial, Manpower, Safety, and Compliance where data exists).',
  schedule:
    'Per project: 100% when no delay; reduced by delay days (90 days delay → 0%). Uses project dates when loaded, else physical progress.',
  financial:
    'Per project: CPI = BCWP ÷ ACWP from dashboard / cost performance (100% = on budget). Portfolio value is the average across projects with cost data.',
  compliance:
    'Per project: average of drawing approval % and DPR activity score. Portfolio value averages projects with compliance data.',
  safety:
    'Per project: SAFE = 100%, WARNING = 55%, CRITICAL = 15% from HSE incidents. Portfolio value averages projects with HSE data.',
} as const;

export const buildPortfolioSummary = (cards: ProjectVitalsCard[]): PortfolioSummary => {
  const withScore = cards.filter((c) => c.overallScore != null);
  if (withScore.length === 0) {
    return {
      portfolioScore: null,
      scheduleHealth: null,
      financialHealth: null,
      compliance: null,
      safetyIndex: null,
      projectsWithScore: 0,
      projectsTotal: cards.length,
    };
  }

  const avgVital = (key: VitalKey) => {
    const values = cards
      .map((c) => c.vitals.find((v) => v.key === key)?.percent)
      .filter((p): p is number => p != null);
    return values.length > 0
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : null;
  };

  return {
    portfolioScore: Math.round(
      withScore.reduce((s, c) => s + (c.overallScore ?? 0), 0) / withScore.length,
    ),
    scheduleHealth: avgVital('schedule'),
    financialHealth: avgVital('budget'),
    compliance: avgVital('compliance'),
    safetyIndex: avgVital('safety'),
    projectsWithScore: withScore.length,
    projectsTotal: cards.length,
  };
};

export const SCORE_COLORS = {
  critical: '#F43F5E',
  watch: '#F59E0B',
  healthy: '#10B981',
  unknown: '#94a3b8',
} as const;

export function scoreToAccent(value: number | null, healthyColor: string = SCORE_COLORS.healthy): string {
  if (value == null) return SCORE_COLORS.unknown;
  if (value < 50) return SCORE_COLORS.critical;
  if (value < 75) return SCORE_COLORS.watch;
  return healthyColor;
}

export const statusColor = (status: VitalStatus): string => {
  switch (status) {
    case 'healthy':
      return SCORE_COLORS.healthy;
    case 'watch':
      return SCORE_COLORS.watch;
    case 'critical':
      return SCORE_COLORS.critical;
    default:
      return SCORE_COLORS.unknown;
  }
};

export const healthBorderClass = (label: HealthLabel): string => {
  switch (label) {
    case 'CRITICAL':
      return 'border-rose-200 ring-1 ring-rose-100';
    case 'AT RISK':
    case 'WATCH':
      return 'border-amber-200 ring-1 ring-amber-100';
    case 'ON TRACK':
    case 'COMPLETED':
      return 'border-emerald-200 ring-1 ring-emerald-100';
    default:
      return 'border-slate-200';
  }
};

export const healthBadgeClass = (label: HealthLabel): string => {
  switch (label) {
    case 'CRITICAL':
      return 'bg-rose-50 text-rose-600 border-rose-200';
    case 'AT RISK':
    case 'WATCH':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'ON TRACK':
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

/** Title-case display for HealthLabel / API project_status. */
export function formatHealthLabelDisplay(
  label: HealthLabel | string | null | undefined,
): string {
  const raw = String(label ?? '').trim();
  if (!raw) return 'No Data';
  if (/^[A-Z\s]+$/.test(raw)) {
    return raw
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return raw;
}
