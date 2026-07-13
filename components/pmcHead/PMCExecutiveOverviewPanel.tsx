import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  HardHat,
  IndianRupee,
  MessageSquare,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ProjectDatesRecord } from '../../services/api';
import type { ProjectHealthTone } from '../../utils/projectDashboardMetrics';
import {
  chartAxisStroke,
  chartAxisTick,
  chartGridStroke,
  chartTooltipStyle,
  formatChartCountAxisTick,
  formatChartCurrencyAxisTick,
} from '../../utils/dashboardCharts';
import { usePmcExecutiveTheme } from '../../utils/pmcExecutiveTheme';
import type { ExecutiveCorrespondenceStats, ExecutiveOverviewAnchor } from '../../utils/executiveOverviewNavigation';
import type { ExecutiveContractSnapshot } from '../../utils/executiveContractSnapshot';
import { EXECUTIVE_CONTRACT_FORMULAS } from '../../utils/executiveContractSnapshot';
import type { ExecutiveQualitySnapshot } from '../../utils/executiveQualitySnapshot';
import { EXECUTIVE_QUALITY_FORMULAS } from '../../utils/executiveQualitySnapshot';
import { formatIndianCurrencyCompact } from '../../utils/format';
import type { PMCExecutiveTab } from './PMCHeadExecutiveShell';
import PMCExecutiveTimeline from './PMCExecutiveTimeline';

export type { ExecutiveContractSnapshot, ExecutiveQualitySnapshot };

export type ExecutiveProgressPoint = {
  month: string;
  planned: number;
  actual: number;
  monthlyPlanned?: number;
  monthlyActual?: number;
};

export type ExecutiveManpowerPoint = {
  month: string;
  planned: number;
  actual: number;
};

export type ExecutiveCostPerformancePoint = {
  month: string;
  bcws: number;
  bcwp: number;
  acwp: number;
  fcst?: number;
};

export type ExecutiveDecisionItem = {
  id: string;
  title: string;
  priority: 'Critical' | 'High' | 'Urgent';
  tab: PMCExecutiveTab;
  action?: string;
};

export type ExecutivePvaMonthBar = {
  month: string;
  planned: number;
  actual: number;
  collection?: number;
};

export type ExecutivePvaPartySnapshot = {
  planned: number;
  actual: number;
  collection: number;
};

export type ExecutivePvaVelocityData = {
  year: number;
  sclMonths: ExecutivePvaMonthBar[];
  contractorMonths: ExecutivePvaMonthBar[];
  current?: {
    scl: ExecutivePvaPartySnapshot | null;
    contractor: ExecutivePvaPartySnapshot | null;
  };
};

interface PMCExecutiveOverviewPanelProps {
  metrics: {
    projectHealth: { label: string; tone: ProjectHealthTone };
    overallProgressPct: number;
    progressDeltaLabel?: string;
    summaryDelayDays: number;
    sclDelayDays: number;
    contractorDelayDays: number;
    criticalRisks: number;
    healthSafetyLabel: string;
    drawingApprovalPct: number;
    cpiPct: number;
    contractValueLabel: string;
    openBottleneckCount: number;
  };
  progressTrend: ExecutiveProgressPoint[];
  decisionQueue: ExecutiveDecisionItem[];
  openIssuesCount: number;
  sclDates?: ProjectDatesRecord | null;
  contractorDates?: ProjectDatesRecord | null;
  onNavigate: (tab: PMCExecutiveTab, anchor?: ExecutiveOverviewAnchor) => void;
  manpowerTrend?: ExecutiveManpowerPoint[];
  costPerformanceTrend?: ExecutiveCostPerformancePoint[];
  qualityPerformancePct?: number;
  qualitySnapshot?: ExecutiveQualitySnapshot | null;
  correspondenceStats?: ExecutiveCorrespondenceStats | null;
  contractSnapshot?: ExecutiveContractSnapshot | null;
  /** Real Planned vs Actual monthly series for Monthly Velocity card. */
  pvaVelocity?: ExecutivePvaVelocityData | null;
}

/** Cohesive executive palette — navy base, teal progress, indigo plan, amber warn, rose critical */
const PALETTE = {
  navy: '#1e3a5f',
  navyDeep: '#0f2744',
  indigo: '#6366f1',
  teal: '#14b8a6',
  emerald: '#10b981',
  sky: '#38bdf8',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  slate: '#64748b',
  track: { light: '#e8edf4', dark: '#1e293b' },
} as const;

const CHART_H = 160;
const CHART_H_SM = 128;
const CHART_H_XS = 108;
const EMPTY_STATE_H = 88;

function anchorForExecutiveTab(tab: PMCExecutiveTab): ExecutiveOverviewAnchor | undefined {
  switch (tab) {
    case 'schedule':
      return 'schedule';
    case 'money':
      return 'financial';
    case 'people':
      return 'manpower';
    case 'risk':
      return 'risk';
    case 'compliance':
      return 'correspondence';
    default:
      return undefined;
  }
}

const healthToneColor = (tone: ProjectHealthTone) => {
  if (tone === 'bad') return PALETTE.rose;
  if (tone === 'warn') return PALETTE.amber;
  return PALETTE.emerald;
};

const priorityStyle = (priority: ExecutiveDecisionItem['priority'], isDark: boolean) => {
  if (priority === 'Critical') {
    return isDark
      ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30'
      : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
  }
  if (priority === 'Urgent') {
    return isDark
      ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
      : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  }
  return isDark
    ? 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'
    : 'bg-sky-50 text-sky-700 ring-1 ring-sky-200';
};

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: string;
  action?: { label: string; onClick: () => void };
  isDark: boolean;
}> = ({ icon, title, subtitle, accent, action, isDark }) => (
  <div className="mb-2 flex items-start justify-between gap-2">
    <div className="flex min-w-0 items-start gap-2.5">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
        style={{ background: `linear-gradient(135deg, ${accent}, ${PALETTE.navy})` }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <h3
          className={`text-[11px] font-black uppercase tracking-wider ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
        >
          {title}
        </h3>
        <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>
      </div>
    </div>
    {action && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          action.onClick();
        }}
        className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-[10px] font-bold transition ${
          isDark
            ? 'bg-white/10 text-sky-300 hover:bg-white/15'
            : 'bg-slate-100 text-[#1e3a5f] hover:bg-slate-200'
        }`}
      >
        {action.label}
        <ArrowRight size={11} />
      </button>
    )}
  </div>
);

const ChartLegend: React.FC<{ items: { label: string; color: string; dashed?: boolean }[] }> = ({
  items,
}) => (
  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
    {items.map((item) => (
      <span key={item.label} className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-slate-500">
        <span
          className={`h-0.5 w-4 rounded-full ${item.dashed ? 'border-t-2 border-dashed bg-transparent' : ''}`}
          style={
            item.dashed
              ? { borderColor: item.color }
              : { backgroundColor: item.color }
          }
        />
        {item.label}
      </span>
    ))}
  </div>
);

const contractMetricCell = (
  label: string,
  value: string,
  isDark: boolean,
  valueClass?: string,
  accent?: string,
) => (
  <div
    className={`rounded-xl border px-2.5 py-2 ${
      isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-100 bg-white shadow-sm'
    }`}
    style={accent ? { borderLeftWidth: 3, borderLeftColor: accent } : undefined}
  >
    <p
      className={`text-[8px] font-bold uppercase tracking-wider ${
        isDark ? 'text-slate-500' : 'text-slate-400'
      }`}
    >
      {label}
    </p>
    <p
      className={`mt-1 truncate text-[11px] font-black tabular-nums leading-none ${
        valueClass ?? (isDark ? 'text-slate-100' : 'text-slate-800')
      }`}
    >
      {value}
    </p>
  </div>
);

const SnapshotSection: React.FC<{
  title: string;
  linkLabel?: string;
  onLink?: () => void;
  isDark: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ title, linkLabel, onLink, isDark, children, className = '' }) => (
  <div
    className={`rounded-xl border p-2.5 ${
      isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50/60'
    } ${className}`}
  >
    <div className="mb-2 flex items-center justify-between gap-2">
      <p
        className={`text-[9px] font-black uppercase tracking-widest ${
          isDark ? 'text-slate-300' : 'text-slate-600'
        }`}
      >
        {title}
      </p>
      {linkLabel && onLink && (
        <button
          type="button"
          onClick={onLink}
          className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold transition ${
            isDark
              ? 'bg-white/10 text-sky-300 hover:bg-white/15'
              : 'bg-white text-indigo-600 shadow-sm hover:bg-indigo-50'
          }`}
        >
          {linkLabel}
          <ArrowRight size={10} />
        </button>
      )}
    </div>
    {children}
  </div>
);

const SnapshotInsightBar: React.FC<{
  label: string;
  value: string;
  fillPct: number;
  color: string;
  isDark: boolean;
}> = ({ label, value, fillPct, color, isDark }) => (
  <div>
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <span
        className={`text-[9px] font-bold uppercase tracking-wide ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        {label}
      </span>
      <span className="shrink-0 text-[11px] font-black tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
    <div
      className={`h-2 overflow-hidden rounded-full ${
        isDark ? 'bg-white/10' : 'bg-slate-200/80'
      }`}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min(100, Math.max(0, fillPct))}%`,
          backgroundColor: color,
        }}
      />
    </div>
  </div>
);

const PMCExecutiveOverviewPanel: React.FC<PMCExecutiveOverviewPanelProps> = ({
  metrics,
  progressTrend,
  decisionQueue,
  openIssuesCount,
  sclDates = null,
  contractorDates = null,
  onNavigate,
  manpowerTrend = [],
  costPerformanceTrend = [],
  qualityPerformancePct,
  qualitySnapshot = null,
  correspondenceStats = null,
  contractSnapshot = null,
  pvaVelocity = null,
}) => {
  const ex = usePmcExecutiveTheme();
  const track = ex.isDark ? PALETTE.track.dark : PALETTE.track.light;
  const [showContractFormulas, setShowContractFormulas] = React.useState(false);
  const [pvaParty, setPvaParty] = useState<'SCL' | 'CONTRACTOR'>('SCL');

  const qualityPct =
    qualitySnapshot?.qualityPerformancePct ??
    (qualityPerformancePct != null && qualityPerformancePct >= 0 ? qualityPerformancePct : null);

  const qualityAccent =
    qualityPct == null
      ? PALETTE.slate
      : qualityPct >= 95
        ? PALETTE.emerald
        : qualityPct >= 85
          ? PALETTE.teal
          : qualityPct >= 70
            ? PALETTE.amber
            : PALETTE.rose;

  const cpiValue = metrics.cpiPct > 0 ? metrics.cpiPct / 100 : 0;
  const cpiDisplay = metrics.cpiPct > 0 ? cpiValue.toFixed(2) : '—';

  const progressChartData = useMemo(() => {
    if (progressTrend.length > 0) return progressTrend;
    return [
      { month: 'Start', planned: 0, actual: 0 },
      { month: 'Now', planned: metrics.overallProgressPct, actual: metrics.overallProgressPct },
    ];
  }, [progressTrend, metrics.overallProgressPct]);

  const monthlyBars = useMemo(() => {
    const fromTrend =
      pvaParty === 'SCL' ? pvaVelocity?.sclMonths ?? [] : pvaVelocity?.contractorMonths ?? [];
    if (fromTrend.length > 0) return fromTrend;

    // Fallback: current-period SCL vs Contractor snapshot as two categories
    const scl = pvaVelocity?.current?.scl;
    const contractor = pvaVelocity?.current?.contractor;
    const snapshotBars: ExecutivePvaMonthBar[] = [];
    if (scl && (scl.planned || scl.actual)) {
      snapshotBars.push({ month: 'SCL', planned: scl.planned, actual: scl.actual, collection: scl.collection });
    }
    if (contractor && (contractor.planned || contractor.actual)) {
      snapshotBars.push({
        month: 'Contractor',
        planned: contractor.planned,
        actual: contractor.actual,
        collection: contractor.collection,
      });
    }
    if (snapshotBars.length > 0) return snapshotBars;

    // Last resort: legacy progress monthly % (not currency)
    return progressChartData.map((p) => ({
      month: p.month,
      planned: Number(p.monthlyPlanned ?? 0),
      actual: Number(p.monthlyActual ?? 0),
    }));
  }, [pvaVelocity, pvaParty, progressChartData]);

  const pvaUsesCurrency =
    (pvaVelocity?.sclMonths?.length ?? 0) > 0 ||
    (pvaVelocity?.contractorMonths?.length ?? 0) > 0 ||
    Boolean(pvaVelocity?.current?.scl || pvaVelocity?.current?.contractor);

  const delayBars = useMemo(
    () => [
      { name: 'SCL', days: Math.max(metrics.sclDelayDays, 0.5), display: metrics.sclDelayDays, fill: PALETTE.sky },
      {
        name: 'Contractor',
        days: Math.max(metrics.contractorDelayDays, 0.5),
        display: metrics.contractorDelayDays,
        fill: PALETTE.violet,
      },
      {
        name: 'Summary',
        days: Math.max(metrics.summaryDelayDays, 0.5),
        display: metrics.summaryDelayDays,
        fill: PALETTE.amber,
      },
    ],
    [metrics.sclDelayDays, metrics.contractorDelayDays, metrics.summaryDelayDays],
  );

  const complianceBars = useMemo(() => {
    const hseScore =
      metrics.healthSafetyLabel === 'SAFE' ? 100 : metrics.healthSafetyLabel === 'CRITICAL' ? 22 : 55;
    const qualityScore =
      qualityPct != null
        ? Math.round(qualityPct)
        : null;
    const correspondenceScore = correspondenceStats
      ? Math.round((correspondenceStats.client.efficiency + correspondenceStats.contractor.efficiency) / 2)
      : null;
    const drawingsScore = Math.round(Number(metrics.drawingApprovalPct) || 0);
    const bottleneckScore =
      metrics.openBottleneckCount === 0 ? 100 : Math.max(20, 100 - metrics.openBottleneckCount * 25);

    return [
      { name: 'HSE', score: hseScore, fill: hseScore >= 80 ? PALETTE.emerald : PALETTE.rose, anchor: 'hse' as ExecutiveOverviewAnchor },
      {
        name: 'Quality',
        score: qualityScore ?? 0,
        fill: (qualityScore ?? 0) >= 75 ? PALETTE.emerald : qualityScore == null ? PALETTE.slate : PALETTE.amber,
        anchor: 'quality' as ExecutiveOverviewAnchor,
        empty: qualityScore == null,
      },
      {
        name: 'Correspondence',
        score: correspondenceScore ?? 0,
        fill:
          (correspondenceScore ?? 0) >= 75
            ? PALETTE.emerald
            : correspondenceScore == null
              ? PALETTE.slate
              : PALETTE.amber,
        anchor: 'correspondence' as ExecutiveOverviewAnchor,
        empty: correspondenceScore == null,
      },
      {
        name: 'Drawings',
        score: drawingsScore,
        fill: drawingsScore >= 75 ? PALETTE.emerald : drawingsScore > 0 ? PALETTE.amber : PALETTE.slate,
        anchor: 'drawings' as ExecutiveOverviewAnchor,
      },
      {
        name: 'Bottlenecks',
        score: bottleneckScore,
        fill: metrics.openBottleneckCount === 0 ? PALETTE.emerald : PALETTE.rose,
        anchor: 'risk' as ExecutiveOverviewAnchor,
      },
    ];
  }, [metrics, qualityPct, correspondenceStats]);

  const correspondenceBars = useMemo(() => {
    if (!correspondenceStats) return [];
    return [
      {
        party: 'Client',
        received: correspondenceStats.client.received,
        delivered: correspondenceStats.client.delivered,
        pending: correspondenceStats.client.pending,
      },
      {
        party: 'Contractor',
        received: correspondenceStats.contractor.received,
        delivered: correspondenceStats.contractor.delivered,
        pending: correspondenceStats.contractor.pending,
      },
    ];
  }, [correspondenceStats]);

  const healthPie = useMemo(
    () => [
      {
        name: 'Score',
        value: Math.max(5, Math.round(metrics.overallProgressPct)),
        fill: PALETTE.teal,
      },
      {
        name: 'Gap',
        value: Math.max(0, 100 - Math.round(metrics.overallProgressPct)),
        fill: track,
      },
    ],
    [metrics.overallProgressPct, track],
  );

  const cpiAccent = useMemo(() => {
    if (metrics.cpiPct <= 0) return PALETTE.slate;
    if (metrics.cpiPct >= 100) return PALETTE.emerald;
    if (metrics.cpiPct >= 90) return PALETTE.amber;
    return PALETTE.rose;
  }, [metrics.cpiPct]);

  const cpiPie = useMemo(() => {
    const pct = Math.min(100, Math.max(0, metrics.cpiPct));
    return [
      { name: 'CPI', value: pct || 1, fill: cpiAccent },
      { name: 'Gap', value: Math.max(0, 100 - (pct || 0)), fill: track },
    ];
  }, [metrics.cpiPct, track, cpiAccent]);

  const kpiStrip = [
    {
      label: 'Status',
      shortLabel: 'Status',
      value: metrics.projectHealth.label,
      color: healthToneColor(metrics.projectHealth.tone),
      surface: metrics.projectHealth.tone === 'bad'
        ? ex.isDark ? 'border-rose-500/25 bg-rose-500/10' : 'border-rose-200 bg-rose-50/90'
        : metrics.projectHealth.tone === 'warn'
          ? ex.isDark ? 'border-amber-500/25 bg-amber-500/10' : 'border-amber-200 bg-amber-50/90'
          : ex.isDark ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50/90',
      onClick: () => onNavigate('risk', 'risk'),
    },
    {
      label: 'Progress',
      shortLabel: 'Progress',
      value: `${Math.round(metrics.overallProgressPct)}%`,
      color: PALETTE.teal,
      surface: ex.isDark ? 'border-teal-500/20 bg-teal-500/10' : 'border-teal-100 bg-teal-50/80',
      onClick: () => onNavigate('schedule', 'progress'),
    },
    {
      label: 'Contractor delay',
      shortLabel: 'Contr. delay',
      value: `${metrics.contractorDelayDays}d`,
      color: metrics.contractorDelayDays > 60 ? PALETTE.rose : PALETTE.violet,
      surface: ex.isDark ? 'border-violet-500/20 bg-violet-500/10' : 'border-violet-100 bg-violet-50/70',
      onClick: () => onNavigate('schedule', 'schedule'),
    },
    {
      label: 'SCL delay',
      shortLabel: 'SCL delay',
      value: `${metrics.sclDelayDays}d`,
      color: metrics.sclDelayDays > 60 ? PALETTE.rose : PALETTE.sky,
      surface: ex.isDark ? 'border-sky-500/20 bg-sky-500/10' : 'border-sky-100 bg-sky-50/80',
      onClick: () => onNavigate('schedule', 'schedule'),
    },
    {
      label: 'Risks',
      shortLabel: 'Risks',
      value: String(metrics.criticalRisks),
      color: metrics.criticalRisks > 0 ? PALETTE.rose : PALETTE.slate,
      surface:
        metrics.criticalRisks > 0
          ? ex.isDark
            ? 'border-rose-500/25 bg-rose-500/10'
            : 'border-rose-200 bg-rose-50/90'
          : ex.isDark
            ? 'border-white/10 bg-white/[0.04]'
            : 'border-slate-200 bg-white',
      onClick: () => onNavigate('risk', 'risk'),
    },
    {
      label: 'Drawings',
      shortLabel: 'Drawings',
      value: `${Math.round(metrics.drawingApprovalPct)}%`,
      color: metrics.drawingApprovalPct >= 75 ? PALETTE.emerald : PALETTE.amber,
      surface:
        metrics.drawingApprovalPct >= 75
          ? ex.isDark
            ? 'border-emerald-500/20 bg-emerald-500/10'
            : 'border-emerald-100 bg-emerald-50/80'
          : ex.isDark
            ? 'border-amber-500/20 bg-amber-500/10'
            : 'border-amber-100 bg-amber-50/80',
      onClick: () => onNavigate('compliance', 'drawings'),
    },
  ];

  const cardBase = ex.isDark
    ? 'rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b1d36]/98 to-[#071428]/90 shadow-[0_8px_32px_rgba(0,0,0,0.22)]'
    : 'rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/90 shadow-[0_8px_32px_rgba(15,39,68,0.06)]';

  const emptyStateClass = `flex items-center justify-center px-3 text-center text-[11px] font-medium ${ex.muted}`;

  return (
    <section
      className={`max-h-[calc(100vh-10.5rem)] overflow-y-auto rounded-2xl border p-2.5 scrollbar-thin sm:p-3 ${
        ex.isDark
          ? 'border-white/10 bg-gradient-to-b from-[#071428]/60 via-[#0b1d36]/40 to-[#071428]/60'
          : 'border-slate-200/90 bg-gradient-to-b from-slate-100/80 via-white/50 to-slate-100/60'
      }`}
      aria-label="Executive overview dashboard"
    >
      {/* KPI ribbon — 6 tiles, equal width */}
      <div className="mb-3 grid grid-cols-2 gap-2 min-[520px]:grid-cols-3 xl:grid-cols-6">
        {kpiStrip.map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={kpi.onClick}
            className={`group relative min-w-0 rounded-xl border px-2 py-2 text-left transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${kpi.surface}`}
          >
            <span
              className={`block truncate text-[8px] font-bold uppercase tracking-wide sm:text-[9px] ${ex.label}`}
              title={kpi.label}
            >
              <span className="hidden min-[900px]:inline">{kpi.label}</span>
              <span className="min-[900px]:hidden">{kpi.shortLabel}</span>
            </span>
            <p
              className={`mt-1 truncate font-black tabular-nums leading-none ${
                kpi.value.length > 5 ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
              }`}
              style={{ color: kpi.color }}
              title={kpi.value}
            >
              {kpi.value}
            </p>
            <span
              className={`pointer-events-none absolute right-1.5 top-1.5 opacity-0 transition group-hover:opacity-100 ${
                ex.isDark ? 'text-slate-500' : 'text-slate-400'
              }`}
              aria-hidden
            >
              <ArrowRight size={10} />
            </span>
          </button>
        ))}
      </div>

      {/* Row 1 — hero progress + side metrics */}
      <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-12">
        <article className={`xl:col-span-8 p-3 sm:p-4 ${cardBase}`}>
          <SectionHeader
            icon={<TrendingUp size={15} />}
            title="Progress curve"
            subtitle="Cumulative plan vs actual S-curve"
            accent={PALETTE.teal}
            action={{ label: 'Schedule', onClick: () => onNavigate('schedule', 'progress') }}
            isDark={ex.isDark}
          />
          <div style={{ height: CHART_H }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressChartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="execPlanFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE.indigo} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={PALETTE.indigo} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="execActualFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE.teal} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={PALETTE.teal} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke={chartGridStroke(ex.isDark)} vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={chartAxisTick(ex.isDark, 10)}
                  axisLine={{ stroke: chartAxisStroke(ex.isDark) }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={chartAxisTick(ex.isDark, 10)}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip contentStyle={chartTooltipStyle(ex.isDark)} formatter={(v: number, n: string) => [`${v}%`, n]} />
                <Area
                  type="monotone"
                  dataKey="planned"
                  stroke={PALETTE.indigo}
                  strokeWidth={2}
                  fill="url(#execPlanFill)"
                  name="Plan"
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke={PALETTE.teal}
                  strokeWidth={2.5}
                  fill="url(#execActualFill)"
                  name="Actual"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend
            items={[
              { label: 'Cumulative plan', color: PALETTE.indigo },
              { label: 'Cumulative actual', color: PALETTE.teal },
            ]}
          />
          {metrics.progressDeltaLabel && (
            <p className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${ex.isDark ? 'bg-teal-500/15 text-teal-300' : 'bg-teal-50 text-teal-700'}`}>
              {metrics.progressDeltaLabel}
            </p>
          )}
        </article>

        <div className="grid gap-3 xl:col-span-4">
          <article className={`p-3 sm:p-4 ${cardBase}`}>
            <SectionHeader
              icon={<BarChart3 size={15} />}
              title="Delay histogram"
              subtitle="Days behind baseline"
              accent={PALETTE.amber}
              action={{ label: 'Schedule', onClick: () => onNavigate('schedule', 'schedule') }}
              isDark={ex.isDark}
            />
            <div style={{ height: CHART_H_XS }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={delayBars} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="22%">
                  <CartesianGrid strokeDasharray="3 6" stroke={chartGridStroke(ex.isDark)} vertical={false} />
                  <XAxis dataKey="name" tick={chartAxisTick(ex.isDark, 10)} axisLine={false} tickLine={false} />
                  <YAxis tick={chartAxisTick(ex.isDark, 10)} axisLine={false} tickLine={false} width={24} />
                  <Tooltip
                    contentStyle={chartTooltipStyle(ex.isDark)}
                    formatter={(_v: number, _n: string, props: { payload?: { display?: number } }) => [
                      `${props.payload?.display ?? 0} days`,
                      'Delay',
                    ]}
                  />
                  <Bar dataKey="days" radius={[8, 8, 0, 0]} maxBarSize={40}>
                    {delayBars.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {metrics.summaryDelayDays === 0 && metrics.sclDelayDays === 0 && metrics.contractorDelayDays === 0 && (
              <p className={`mt-1 text-center text-[10px] font-semibold ${ex.isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                On schedule — no delays recorded
              </p>
            )}
          </article>

          <article className={`p-3 sm:p-4 ${cardBase}`}>
            <div className="flex items-center gap-2.5">
              <div className="relative h-[68px] w-[68px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={healthPie} innerRadius={24} outerRadius={36} dataKey="value" startAngle={90} endAngle={-270} stroke="none">
                      {healthPie.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-sm font-black ${ex.headingStrong}`}>{Math.round(metrics.overallProgressPct)}%</span>
                  <span className={`text-[8px] font-bold uppercase ${ex.label}`}>Done</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[10px] font-bold uppercase ${ex.label}`}>Project health</p>
                <p className="text-lg font-black" style={{ color: healthToneColor(metrics.projectHealth.tone) }}>
                  {metrics.projectHealth.label}
                </p>
                <p className={`text-[10px] ${ex.muted}`}>{openIssuesCount} open issues tracked</p>
              </div>
            </div>
          </article>
        </div>
      </div>

      {/* Row 2 — velocity, compliance, correspondence */}
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <article
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('money', 'planned-vs-actual')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigate('money', 'planned-vs-actual');
            }
          }}
          className={`cursor-pointer p-3 transition-shadow hover:shadow-md sm:p-4 ${cardBase}`}
          aria-label="Open Planned vs Actual Value full view"
        >
          <SectionHeader
            icon={<Activity size={15} />}
            title="Monthly velocity"
            subtitle={
              pvaUsesCurrency
                ? `Planned vs actual value · ${pvaVelocity?.year ?? ''}`.trim()
                : 'Planned vs actual throughput'
            }
            accent={PALETTE.indigo}
            action={{
              label: 'Open',
              onClick: () => onNavigate('money', 'planned-vs-actual'),
            }}
            isDark={ex.isDark}
          />

          {pvaUsesCurrency && (
            <div
              className="mb-2 flex gap-1"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {(['SCL', 'CONTRACTOR'] as const).map((party) => (
                <button
                  key={party}
                  type="button"
                  onClick={() => setPvaParty(party)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
                    pvaParty === party
                      ? ex.isDark
                        ? 'bg-indigo-500/30 text-indigo-200'
                        : 'bg-indigo-100 text-indigo-800'
                      : ex.isDark
                        ? 'bg-white/5 text-slate-400 hover:bg-white/10'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {party === 'SCL' ? 'SCL' : 'Contractor'}
                </button>
              ))}
            </div>
          )}

          {monthlyBars.length > 0 ? (
            <>
              <div style={{ height: CHART_H_SM + 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyBars}
                    margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
                    barGap={2}
                    barCategoryGap="18%"
                  >
                    <CartesianGrid strokeDasharray="3 6" stroke={chartGridStroke(ex.isDark)} vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={chartAxisTick(ex.isDark, 9)}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={chartAxisTick(ex.isDark, 10)}
                      axisLine={false}
                      tickLine={false}
                      width={pvaUsesCurrency ? 44 : 28}
                      tickFormatter={
                        pvaUsesCurrency ? formatChartCurrencyAxisTick : undefined
                      }
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle(ex.isDark)}
                      formatter={(v: number, name: string) => [
                        pvaUsesCurrency
                          ? formatIndianCurrencyCompact(v)
                          : `${v}%`,
                        name === 'planned' ? 'Planned' : 'Actual',
                      ]}
                    />
                    <Bar
                      dataKey="planned"
                      fill={PALETTE.indigo}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={18}
                      name="planned"
                    />
                    <Bar
                      dataKey="actual"
                      fill={PALETTE.teal}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={18}
                      name="actual"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ChartLegend
                items={[
                  { label: pvaUsesCurrency ? 'Planned value' : 'Monthly planned', color: PALETTE.indigo },
                  { label: pvaUsesCurrency ? 'Actual value' : 'Monthly actual', color: PALETTE.teal },
                ]}
              />
              {pvaUsesCurrency && pvaVelocity?.current && (
                <div
                  className={`mt-2 grid grid-cols-2 gap-2 border-t pt-2 ${ex.isDark ? 'border-white/10' : 'border-slate-100'}`}
                >
                  {[
                    { label: 'SCL now', snap: pvaVelocity.current.scl },
                    { label: 'Contractor now', snap: pvaVelocity.current.contractor },
                  ].map((row) => (
                    <div key={row.label} className="min-w-0">
                      <p className={`text-[9px] font-bold uppercase ${ex.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {row.label}
                      </p>
                      <p className={`truncate text-[11px] font-black tabular-nums ${ex.isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                        {row.snap
                          ? `${formatIndianCurrencyCompact(row.snap.planned)} → ${formatIndianCurrencyCompact(row.snap.actual)}`
                          : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className={emptyStateClass} style={{ minHeight: EMPTY_STATE_H }}>
              No Planned vs Actual data for this project yet
            </p>
          )}
        </article>

        <article className={`flex flex-col p-3 sm:p-4 ${cardBase}`}>
          <SectionHeader
            icon={<Shield size={15} />}
            title="Compliance pulse"
            subtitle="Governance score by area"
            accent={PALETTE.emerald}
            action={{ label: 'Details', onClick: () => onNavigate('compliance', 'hse') }}
            isDark={ex.isDark}
          />
          <ul className="mt-1 flex flex-1 flex-col justify-center gap-2.5">
            {complianceBars.map((row) => {
              const widthPct = row.empty ? 0 : Math.min(100, Math.max(0, row.score));
              return (
                <li key={row.name}>
                  <button
                    type="button"
                    onClick={() => onNavigate('compliance', row.anchor)}
                    className="group w-full text-left"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span
                        className={`text-[11px] font-bold tracking-wide ${
                          ex.isDark ? 'text-slate-200 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900'
                        }`}
                      >
                        {row.name}
                      </span>
                      <span
                        className={`tabular-nums text-[11px] font-black ${
                          ex.isDark ? 'text-slate-100' : 'text-slate-800'
                        }`}
                      >
                        {row.empty ? '—' : `${row.score}%`}
                      </span>
                    </div>
                    <div
                      className={`h-2.5 overflow-hidden rounded-full ${
                        ex.isDark ? 'bg-white/10' : 'bg-slate-100'
                      }`}
                    >
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: row.fill,
                          minWidth: widthPct > 0 ? 6 : 0,
                        }}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </article>

        <article className={`flex flex-col p-3 sm:p-4 md:col-span-2 xl:col-span-1 ${cardBase}`}>
          <SectionHeader
            icon={<MessageSquare size={15} />}
            title="Correspondence & delivery"
            subtitle="Received · delivered · pending"
            accent={PALETTE.sky}
            action={{ label: 'Open', onClick: () => onNavigate('compliance', 'correspondence') }}
            isDark={ex.isDark}
          />
          {correspondenceBars.length > 0 ? (
            <>
              <div className="mt-1 min-h-0 flex-1" style={{ height: CHART_H_SM + 8 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={correspondenceBars}
                    margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
                    barGap={3}
                    barCategoryGap="28%"
                  >
                    <CartesianGrid strokeDasharray="3 6" stroke={chartGridStroke(ex.isDark)} vertical={false} />
                    <XAxis
                      dataKey="party"
                      tick={chartAxisTick(ex.isDark, 11)}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={chartAxisTick(ex.isDark, 10)}
                      axisLine={false}
                      tickLine={false}
                      width={26}
                      allowDecimals={false}
                      tickFormatter={formatChartCountAxisTick}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle(ex.isDark)}
                      formatter={(v: number, name: string) => [v, name]}
                    />
                    <Bar
                      dataKey="received"
                      fill={PALETTE.indigo}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={20}
                      name="Received"
                    />
                    <Bar
                      dataKey="delivered"
                      fill={PALETTE.teal}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={20}
                      name="Delivered"
                    />
                    <Bar
                      dataKey="pending"
                      fill={PALETTE.amber}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={20}
                      name="Pending"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ChartLegend
                items={[
                  { label: 'Received', color: PALETTE.indigo },
                  { label: 'Delivered', color: PALETTE.teal },
                  { label: 'Pending', color: PALETTE.amber },
                ]}
              />
              <div
                className={`mt-2 grid grid-cols-2 gap-2 border-t pt-2 ${
                  ex.isDark ? 'border-white/10' : 'border-slate-100'
                }`}
              >
                {correspondenceBars.map((row) => (
                  <div
                    key={row.party}
                    className={`rounded-lg px-2 py-1.5 ${ex.isDark ? 'bg-white/5' : 'bg-slate-50'}`}
                  >
                    <p
                      className={`text-[9px] font-bold uppercase tracking-wide ${
                        ex.isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {row.party}
                    </p>
                    <p
                      className={`mt-0.5 text-[10px] font-semibold tabular-nums ${
                        ex.isDark ? 'text-slate-200' : 'text-slate-700'
                      }`}
                    >
                      {row.received} in · {row.delivered} out · {row.pending} pending
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className={emptyStateClass} style={{ minHeight: EMPTY_STATE_H }}>
              No correspondence data for the selected period
            </p>
          )}
        </article>
      </div>

      {/* Row 3 — manpower, financial, quality */}
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <article className={`p-3 sm:p-4 ${cardBase}`}>
          <SectionHeader
            icon={<Users size={15} />}
            title="Manpower histogram"
            subtitle="Planned vs actual headcount by period"
            accent={PALETTE.violet}
            action={{ label: 'People', onClick: () => onNavigate('people', 'manpower') }}
            isDark={ex.isDark}
          />
          {manpowerTrend.length > 0 ? (
            <>
              <div style={{ height: CHART_H_SM }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={manpowerTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barGap={2} barCategoryGap="18%">
                    <CartesianGrid strokeDasharray="3 6" stroke={chartGridStroke(ex.isDark)} vertical={false} />
                    <XAxis dataKey="month" tick={chartAxisTick(ex.isDark, 9)} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={chartAxisTick(ex.isDark, 10)} axisLine={false} tickLine={false} width={28} tickFormatter={formatChartCountAxisTick} />
                    <Tooltip contentStyle={chartTooltipStyle(ex.isDark)} formatter={(v: number) => [v, '']} />
                    <Bar dataKey="planned" fill={PALETTE.indigo} radius={[4, 4, 0, 0]} maxBarSize={18} name="Planned" />
                    <Bar dataKey="actual" fill={PALETTE.amber} radius={[4, 4, 0, 0]} maxBarSize={18} name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ChartLegend
                items={[
                  { label: 'Planned manpower', color: PALETTE.indigo },
                  { label: 'Actual manpower', color: PALETTE.amber },
                ]}
              />
            </>
          ) : (
            <p className={emptyStateClass} style={{ minHeight: EMPTY_STATE_H }}>
              No manpower trend data yet
            </p>
          )}
        </article>

        <article className={`p-3 sm:p-4 md:col-span-2 xl:col-span-1 ${cardBase}`}>
          <SectionHeader
            icon={<IndianRupee size={15} />}
            title="Financial progress"
            subtitle="BCWS · BCWP · ACWP · FCST"
            accent={PALETTE.indigo}
            action={{ label: 'Money', onClick: () => onNavigate('money', 'financial') }}
            isDark={ex.isDark}
          />
          {costPerformanceTrend.length > 0 ? (
            <>
              <div style={{ height: CHART_H_SM }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={costPerformanceTrend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 6" stroke={chartGridStroke(ex.isDark)} vertical={false} />
                    <XAxis dataKey="month" tick={chartAxisTick(ex.isDark, 9)} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={chartAxisTick(ex.isDark, 9)} axisLine={false} tickLine={false} width={48} tickFormatter={formatChartCurrencyAxisTick} />
                    <Tooltip contentStyle={chartTooltipStyle(ex.isDark)} />
                    <Line type="monotone" dataKey="bcws" stroke={PALETTE.indigo} strokeWidth={2} name="BCWS" dot={false} />
                    <Line type="monotone" dataKey="bcwp" stroke={PALETTE.amber} strokeWidth={2} name="BCWP" dot={false} />
                    <Line type="monotone" dataKey="acwp" stroke={PALETTE.rose} strokeWidth={2} name="ACWP" dot={false} />
                    <Line type="monotone" dataKey="fcst" stroke={PALETTE.emerald} strokeWidth={2} strokeDasharray="5 4" name="FCST" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <ChartLegend
                items={[
                  { label: 'BCWS', color: PALETTE.indigo },
                  { label: 'BCWP', color: PALETTE.amber },
                  { label: 'ACWP', color: PALETTE.rose },
                  { label: 'FCST', color: PALETTE.emerald, dashed: true },
                ]}
              />
            </>
          ) : (
            <p className={emptyStateClass} style={{ minHeight: EMPTY_STATE_H }}>
              No financial progress trend data yet
            </p>
          )}
        </article>

        <article className={`p-3 sm:p-4 ${cardBase}`}>
          <SectionHeader
            icon={<HardHat size={15} />}
            title="Project Quality Status"
            subtitle={
              qualitySnapshot?.periodLabel
                ? `Material testing · ${qualitySnapshot.periodLabel}`
                : 'Tests required, conducted & pass rate'
            }
            accent={PALETTE.teal}
            action={{ label: 'Open', onClick: () => onNavigate('compliance', 'quality') }}
            isDark={ex.isDark}
          />
          {qualitySnapshot?.hasData || qualityPct != null ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="relative h-[72px] w-[72px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: 'Score',
                            value: Math.min(100, Math.round(qualityPct ?? 0)) || 1,
                            fill: qualityAccent,
                          },
                          {
                            name: 'Gap',
                            value: Math.max(0, 100 - Math.round(qualityPct ?? 0)),
                            fill: track,
                          },
                        ]}
                        innerRadius={22}
                        outerRadius={34}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-sm font-black leading-none ${ex.headingStrong}`}>
                      {Math.round(qualityPct ?? 0)}%
                    </span>
                    <span className={`mt-0.5 text-[7px] font-bold uppercase ${ex.label}`}>Pass rate</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[9px] font-bold uppercase tracking-wide ${ex.label}`}>
                    Quality performance
                  </p>
                  <p className={`mt-0.5 text-lg font-black tabular-nums leading-none`} style={{ color: qualityAccent }}>
                    {qualitySnapshot?.status.label ??
                      (qualityPct != null && qualityPct >= 75 ? 'ON TARGET' : 'REVIEW')}
                  </p>
                  {qualitySnapshot && (
                    <p className={`mt-1 text-[10px] font-semibold ${ex.muted}`}>
                      {qualitySnapshot.testsPassed} passed · {qualitySnapshot.testsFailed} failed
                    </p>
                  )}
                </div>
              </div>

              {qualitySnapshot && (
                <>
                  <div className="grid grid-cols-2 gap-1.5">
                    {contractMetricCell(
                      'Required',
                      String(qualitySnapshot.testsRequired),
                      ex.isDark,
                      undefined,
                      PALETTE.indigo,
                    )}
                    {contractMetricCell(
                      'Conducted',
                      String(qualitySnapshot.testsConducted),
                      ex.isDark,
                      undefined,
                      PALETTE.teal,
                    )}
                    {contractMetricCell(
                      'Shortfall',
                      String(qualitySnapshot.shortfall),
                      ex.isDark,
                      qualitySnapshot.shortfall > 0
                        ? ex.isDark
                          ? 'text-amber-300'
                          : 'text-amber-700'
                        : ex.isDark
                          ? 'text-emerald-300'
                          : 'text-emerald-700',
                      qualitySnapshot.shortfall > 0 ? PALETTE.amber : PALETTE.emerald,
                    )}
                    {contractMetricCell(
                      'Completion',
                      `${qualitySnapshot.completionRatePct}%`,
                      ex.isDark,
                      undefined,
                      PALETTE.sky,
                    )}
                  </div>
                  <p className={`text-[8px] leading-snug ${ex.muted}`}>
                    {EXECUTIVE_QUALITY_FORMULAS.performance}. {EXECUTIVE_QUALITY_FORMULAS.shortfall}.
                  </p>
                </>
              )}
            </div>
          ) : (
            <p className={emptyStateClass} style={{ minHeight: EMPTY_STATE_H }}>
              No Project Quality Status data for this period
            </p>
          )}
        </article>
      </div>

      {/* Row 4 — contract, schedule, decisions */}
      <div className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-12">
        <article
          className={`flex flex-col xl:col-span-5 p-3.5 sm:p-4 ${cardBase} ${
            ex.isDark
              ? 'bg-gradient-to-br from-indigo-950/50 via-[#0b1d36]/95 to-[#071428]/90'
              : 'bg-gradient-to-br from-indigo-50/90 via-white to-slate-50'
          }`}
        >
          <SectionHeader
            icon={<IndianRupee size={15} />}
            title="Contract snapshot"
            subtitle="SCL contract values & billing"
            accent={PALETTE.indigo}
            action={{ label: 'Financial', onClick: () => onNavigate('money', 'financial') }}
            isDark={ex.isDark}
          />

          {contractSnapshot &&
          (contractSnapshot.hasContractValue ||
            contractSnapshot.hasInvoicing ||
            contractSnapshot.hasCostData) ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <div
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                  ex.isDark
                    ? 'border-white/10 bg-white/[0.05]'
                    : 'border-indigo-100 bg-white shadow-sm'
                }`}
              >
                <div className="relative h-[52px] w-[52px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cpiPie}
                        innerRadius={18}
                        outerRadius={26}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                      >
                        {cpiPie.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-[11px] font-black leading-none ${ex.headingStrong}`}>
                      {cpiDisplay}
                    </span>
                    <span className={`mt-0.5 text-[7px] font-bold uppercase ${ex.label}`}>CPI</span>
                  </div>
                </div>
                <div
                  className={`hidden h-10 w-px shrink-0 sm:block ${
                    ex.isDark ? 'bg-white/10' : 'bg-slate-200'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-[9px] font-bold uppercase tracking-wider ${ex.label}`}>
                    Revised contract
                  </p>
                  <p className={`truncate text-lg font-black leading-tight ${ex.headingStrong}`}>
                    {contractSnapshot.hasContractValue
                      ? formatIndianCurrencyCompact(contractSnapshot.revisedValue)
                      : metrics.contractValueLabel}
                  </p>
                </div>
                {contractSnapshot.hasContractValue && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black tabular-nums ${
                      contractSnapshot.growthPct >= 0
                        ? ex.isDark
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-emerald-50 text-emerald-700'
                        : ex.isDark
                          ? 'bg-rose-500/15 text-rose-300'
                          : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {contractSnapshot.growthPct >= 0 ? '▲' : '▼'}{' '}
                    {Math.abs(contractSnapshot.growthPct).toFixed(0)}%
                  </span>
                )}
              </div>

              <div
                className={`grid min-h-0 flex-1 gap-2.5 ${
                  contractSnapshot.hasContractValue && contractSnapshot.hasInvoicing
                    ? 'sm:grid-cols-2'
                    : 'grid-cols-1'
                }`}
              >
                {contractSnapshot.hasContractValue && (
                  <SnapshotSection
                    title="Contract values"
                    linkLabel="Open"
                    onLink={() => onNavigate('money', 'contract-values')}
                    isDark={ex.isDark}
                  >
                    <div className="grid grid-cols-2 gap-1.5">
                      {contractMetricCell(
                        'Original',
                        formatIndianCurrencyCompact(contractSnapshot.originalValue),
                        ex.isDark,
                        undefined,
                        PALETTE.indigo,
                      )}
                      {contractMetricCell(
                        'Excess',
                        formatIndianCurrencyCompact(contractSnapshot.excessValue),
                        ex.isDark,
                        ex.isDark ? 'text-emerald-300' : 'text-emerald-700',
                        PALETTE.emerald,
                      )}
                      {contractMetricCell(
                        'Saving',
                        formatIndianCurrencyCompact(contractSnapshot.saving),
                        ex.isDark,
                        contractSnapshot.saving > 0
                          ? ex.isDark
                            ? 'text-rose-300'
                            : 'text-rose-600'
                          : undefined,
                        contractSnapshot.saving > 0 ? PALETTE.rose : PALETTE.slate,
                      )}
                      {contractMetricCell(
                        'Revised',
                        formatIndianCurrencyCompact(contractSnapshot.revisedValue),
                        ex.isDark,
                        undefined,
                        PALETTE.sky,
                      )}
                    </div>
                    <div className="mt-2.5">
                      <SnapshotInsightBar
                        label="Growth vs original"
                        value={`${contractSnapshot.growthPct.toFixed(0)}%`}
                        fillPct={Math.min(100, Math.abs(contractSnapshot.growthPct))}
                        color={contractSnapshot.growthPct >= 0 ? PALETTE.emerald : PALETTE.rose}
                        isDark={ex.isDark}
                      />
                    </div>
                  </SnapshotSection>
                )}

                {contractSnapshot.hasInvoicing && (
                  <SnapshotSection
                    title="Invoicing"
                    linkLabel="Open"
                    onLink={() => onNavigate('money', 'invoicing')}
                    isDark={ex.isDark}
                  >
                    <div className="grid grid-cols-2 gap-1.5">
                      {contractMetricCell(
                        'Gross billed',
                        formatIndianCurrencyCompact(contractSnapshot.grossBilled ?? 0),
                        ex.isDark,
                        undefined,
                        PALETTE.indigo,
                      )}
                      {contractMetricCell(
                        'Certified',
                        formatIndianCurrencyCompact(contractSnapshot.grossCertified ?? 0),
                        ex.isDark,
                        undefined,
                        PALETTE.sky,
                      )}
                      {contractMetricCell(
                        'Difference',
                        formatIndianCurrencyCompact(contractSnapshot.billingDifference ?? 0),
                        ex.isDark,
                        (contractSnapshot.billingDifference ?? 0) >= 0
                          ? ex.isDark
                            ? 'text-emerald-300'
                            : 'text-emerald-700'
                          : ex.isDark
                            ? 'text-rose-300'
                            : 'text-rose-600',
                        (contractSnapshot.billingDifference ?? 0) >= 0 ? PALETTE.emerald : PALETTE.rose,
                      )}
                      {contractMetricCell(
                        'Efficiency',
                        contractSnapshot.certificationEfficiencyPct != null
                          ? `${Math.round(contractSnapshot.certificationEfficiencyPct)}%`
                          : '—',
                        ex.isDark,
                        (contractSnapshot.certificationEfficiencyPct ?? 0) >= 90
                          ? ex.isDark
                            ? 'text-emerald-300'
                            : 'text-emerald-700'
                          : undefined,
                        (contractSnapshot.certificationEfficiencyPct ?? 0) >= 90
                          ? PALETTE.emerald
                          : PALETTE.amber,
                      )}
                    </div>
                    {contractSnapshot.certificationEfficiencyPct != null && (
                      <div className="mt-2.5">
                        <SnapshotInsightBar
                          label="Certification rate"
                          value={`${contractSnapshot.certificationEfficiencyPct.toFixed(0)}%`}
                          fillPct={Math.min(100, contractSnapshot.certificationEfficiencyPct)}
                          color={
                            contractSnapshot.certificationEfficiencyPct >= 90
                              ? PALETTE.emerald
                              : contractSnapshot.certificationEfficiencyPct >= 75
                                ? PALETTE.amber
                                : PALETTE.rose
                          }
                          isDark={ex.isDark}
                        />
                      </div>
                    )}
                  </SnapshotSection>
                )}
              </div>

              {contractSnapshot.hasCostData && (
                <div
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-3 py-2 text-[10px] ${
                    ex.isDark
                      ? 'border-white/10 bg-white/[0.03]'
                      : 'border-slate-100 bg-white/80'
                  }`}
                >
                  <span className={`font-bold uppercase tracking-wide ${ex.label}`}>Cost</span>
                  <span className={`font-semibold tabular-nums ${ex.body}`}>
                    BCWP {formatIndianCurrencyCompact(contractSnapshot.bcwp)}
                  </span>
                  <span className={ex.muted}>·</span>
                  <span className={`font-semibold tabular-nums ${ex.body}`}>
                    AC {formatIndianCurrencyCompact(contractSnapshot.ac)}
                  </span>
                  <span className={ex.muted}>·</span>
                  <span
                    className="font-black tabular-nums"
                    style={{
                      color: contractSnapshot.costVariance >= 0 ? PALETTE.emerald : PALETTE.rose,
                    }}
                  >
                    Δ {formatIndianCurrencyCompact(contractSnapshot.costVariance, { showSign: true })}
                  </span>
                </div>
              )}

              <div
                className={`mt-auto border-t pt-2 ${ex.isDark ? 'border-white/10' : 'border-slate-100'}`}
              >
                <button
                  type="button"
                  onClick={() => setShowContractFormulas((open) => !open)}
                  className={`text-[9px] font-bold uppercase tracking-wide ${
                    ex.isDark ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-600 hover:text-indigo-700'
                  }`}
                >
                  {showContractFormulas ? 'Hide calculation notes' : 'How these numbers are calculated'}
                </button>
                {showContractFormulas && (
                  <ul className={`mt-1.5 space-y-1 text-[8px] leading-relaxed ${ex.muted}`}>
                    <li>{EXECUTIVE_CONTRACT_FORMULAS.revised}</li>
                    <li>{EXECUTIVE_CONTRACT_FORMULAS.growth}</li>
                    <li>{EXECUTIVE_CONTRACT_FORMULAS.certification}</li>
                    <li>{EXECUTIVE_CONTRACT_FORMULAS.difference}</li>
                    <li>{EXECUTIVE_CONTRACT_FORMULAS.cpi}</li>
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <p className={`flex flex-1 items-center text-[11px] leading-snug ${ex.muted}`}>
              Enter SCL contract values and invoicing in Financial to see the summary here.
            </p>
          )}
        </article>

        <article className={`flex flex-col xl:col-span-4 p-3.5 sm:p-4 ${cardBase}`}>
          <SectionHeader
            icon={<Calendar size={15} />}
            title="Schedule timeline"
            subtitle="SCL & contractor milestones"
            accent={PALETTE.sky}
            action={{ label: 'Open', onClick: () => onNavigate('schedule', 'schedule') }}
            isDark={ex.isDark}
          />
          <PMCExecutiveTimeline
            scl={sclDates}
            contractor={contractorDates}
            className="min-h-0 flex-1 !rounded-xl !shadow-none !border-0 [&>div:first-child]:hidden [&>div:last-child]:flex [&>div:last-child]:min-h-0 [&>div:last-child]:flex-1 [&>div:last-child]:flex-col [&>div:last-child]:justify-center [&>div:last-child]:p-2 sm:[&>div:last-child]:p-2.5 [&>div:last-child]:space-y-3"
          />
        </article>

        <article className={`flex flex-col xl:col-span-3 p-3.5 sm:p-4 ${cardBase}`}>
          <SectionHeader
            icon={<AlertTriangle size={15} />}
            title="Bottleneck"
            subtitle={`${decisionQueue.filter((d) => d.id !== 'clear').length} items need attention`}
            accent={PALETTE.rose}
            action={{ label: 'Risk', onClick: () => onNavigate('risk', 'risk') }}
            isDark={ex.isDark}
          />
          <ul className="flex min-h-0 flex-1 flex-col gap-2">
            {decisionQueue.slice(0, 4).map((item) =>
              item.id === 'clear' ? (
                <li
                  key={item.id}
                  className={`flex flex-1 items-center justify-center rounded-xl border border-dashed px-3 py-6 text-center text-[11px] font-medium ${
                    ex.isDark ? 'border-white/15 text-slate-400' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {item.title}
                </li>
              ) : (
                <li
                  key={item.id}
                  className={`flex items-start justify-between gap-2 rounded-xl border px-3 py-2.5 transition hover:shadow-sm ${
                    ex.isDark
                      ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                      : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase ${priorityStyle(item.priority, ex.isDark)}`}>
                        {item.priority}
                      </span>
                    </div>
                    <p className={`mt-1 line-clamp-2 text-[11px] font-semibold leading-snug ${ex.body}`}>{item.title}</p>
                  </div>
                  {item.action && (
                    <button
                      type="button"
                      onClick={() => onNavigate(item.tab, anchorForExecutiveTab(item.tab))}
                      className={`shrink-0 rounded-lg px-2 py-1 text-[9px] font-bold uppercase transition ${
                        ex.isDark ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      {item.action}
                    </button>
                  )}
                </li>
              ),
            )}
          </ul>
        </article>
      </div>
    </section>
  );
};

export default PMCExecutiveOverviewPanel;
