import React, { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  IndianRupee,
  Shield,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
} from '../../utils/dashboardCharts';
import { usePmcExecutiveTheme } from '../../utils/pmcExecutiveTheme';
import type { PMCExecutiveTab } from './PMCHeadExecutiveShell';
import PMCExecutiveTimeline from './PMCExecutiveTimeline';

export type ExecutiveProgressPoint = {
  month: string;
  planned: number;
  actual: number;
  monthlyPlanned?: number;
  monthlyActual?: number;
};

export type ExecutiveDecisionItem = {
  id: string;
  title: string;
  priority: 'Critical' | 'High' | 'Urgent';
  tab: PMCExecutiveTab;
  action?: string;
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
  onJumpToTab: (tab: PMCExecutiveTab) => void;
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

const CHART_H = 172;
const CHART_H_SM = 140;

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
  <div className="mb-3 flex items-start justify-between gap-2">
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
        onClick={action.onClick}
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

const PMCExecutiveOverviewPanel: React.FC<PMCExecutiveOverviewPanelProps> = ({
  metrics,
  progressTrend,
  decisionQueue,
  openIssuesCount,
  sclDates = null,
  contractorDates = null,
  onJumpToTab,
}) => {
  const ex = usePmcExecutiveTheme();
  const track = ex.isDark ? PALETTE.track.dark : PALETTE.track.light;

  const cpiValue = metrics.cpiPct > 0 ? metrics.cpiPct / 100 : 0;
  const cpiDisplay = metrics.cpiPct > 0 ? cpiValue.toFixed(2) : '—';

  const progressChartData = useMemo(() => {
    if (progressTrend.length > 0) return progressTrend;
    return [
      { month: 'Start', planned: 0, actual: 0 },
      { month: 'Now', planned: metrics.overallProgressPct, actual: metrics.overallProgressPct },
    ];
  }, [progressTrend, metrics.overallProgressPct]);

  const monthlyBars = useMemo(
    () =>
      progressChartData.map((p) => ({
        month: p.month,
        planned: Number(p.monthlyPlanned ?? 0),
        actual: Number(p.monthlyActual ?? 0),
      })),
    [progressChartData],
  );

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
    return [
      { name: 'HSE', score: hseScore, fill: hseScore >= 80 ? PALETTE.emerald : PALETTE.rose },
      {
        name: 'Drawings',
        score: Math.round(metrics.drawingApprovalPct),
        fill: metrics.drawingApprovalPct >= 75 ? PALETTE.emerald : PALETTE.amber,
      },
      {
        name: 'Bottlenecks',
        score: metrics.openBottleneckCount === 0 ? 100 : Math.max(20, 100 - metrics.openBottleneckCount * 25),
        fill: metrics.openBottleneckCount === 0 ? PALETTE.emerald : PALETTE.rose,
      },
      {
        name: 'Risks',
        score: metrics.criticalRisks === 0 ? 100 : Math.max(15, 100 - metrics.criticalRisks * 20),
        fill: metrics.criticalRisks === 0 ? PALETTE.emerald : PALETTE.rose,
      },
    ];
  }, [metrics]);

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

  const cpiPie = useMemo(() => {
    const pct = Math.min(100, Math.max(0, metrics.cpiPct));
    return [
      { name: 'CPI', value: pct || 1, fill: pct >= 100 ? PALETTE.emerald : PALETTE.indigo },
      { name: 'Gap', value: Math.max(0, 100 - (pct || 0)), fill: track },
    ];
  }, [metrics.cpiPct, track]);

  const kpiStrip = [
    {
      label: 'Status',
      value: metrics.projectHealth.label,
      color: healthToneColor(metrics.projectHealth.tone),
      bg: ex.isDark ? 'from-rose-500/10' : 'from-rose-50',
    },
    {
      label: 'Progress',
      value: `${Math.round(metrics.overallProgressPct)}%`,
      color: PALETTE.teal,
      bg: ex.isDark ? 'from-teal-500/10' : 'from-teal-50',
    },
    {
      label: 'SCL Delay',
      value: `${metrics.sclDelayDays}d`,
      color: PALETTE.sky,
      bg: ex.isDark ? 'from-sky-500/10' : 'from-sky-50',
    },
    {
      label: 'Ctr Delay',
      value: `${metrics.contractorDelayDays}d`,
      color: PALETTE.violet,
      bg: ex.isDark ? 'from-violet-500/10' : 'from-violet-50',
    },
    {
      label: 'Risks',
      value: String(metrics.criticalRisks),
      color: metrics.criticalRisks > 0 ? PALETTE.rose : PALETTE.slate,
      bg: ex.isDark ? 'from-slate-500/10' : 'from-slate-50',
    },
    {
      label: 'HSE',
      value: metrics.healthSafetyLabel,
      color: metrics.healthSafetyLabel === 'SAFE' ? PALETTE.emerald : PALETTE.rose,
      bg: ex.isDark ? 'from-emerald-500/10' : 'from-emerald-50',
    },
    {
      label: 'Drawings',
      value: `${Math.round(metrics.drawingApprovalPct)}%`,
      color: metrics.drawingApprovalPct >= 75 ? PALETTE.emerald : PALETTE.amber,
      bg: ex.isDark ? 'from-amber-500/10' : 'from-amber-50',
    },
  ];

  const cardBase = ex.isDark
    ? 'rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b1d36]/98 to-[#071428]/90 shadow-[0_8px_32px_rgba(0,0,0,0.22)]'
    : 'rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/90 shadow-[0_8px_32px_rgba(15,39,68,0.06)]';

  return (
    <section
      className={`max-h-[calc(100vh-10.5rem)] overflow-y-auto rounded-2xl border p-2.5 scrollbar-thin sm:p-3 ${
        ex.isDark
          ? 'border-white/10 bg-gradient-to-b from-[#071428]/60 via-[#0b1d36]/40 to-[#071428]/60'
          : 'border-slate-200/90 bg-gradient-to-b from-slate-100/80 via-white/50 to-slate-100/60'
      }`}
      aria-label="Executive overview dashboard"
    >
      {/* KPI ribbon — pill cards */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {kpiStrip.map((kpi) => (
          <div
            key={kpi.label}
            className={`relative overflow-hidden rounded-xl border px-2.5 py-2 text-center ${
              ex.isDark ? 'border-white/10 bg-[#0f2744]/80' : 'border-slate-200/70 bg-white'
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${kpi.bg} to-transparent opacity-80`} />
            <div className="relative">
              <span className={`text-[9px] font-bold uppercase tracking-wide ${ex.label}`}>{kpi.label}</span>
              <p className="mt-0.5 truncate text-sm font-black tabular-nums" style={{ color: kpi.color }}>
                {kpi.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Row 1 — hero progress + side metrics */}
      <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-12">
        <article className={`xl:col-span-8 p-4 ${cardBase}`}>
          <SectionHeader
            icon={<TrendingUp size={15} />}
            title="Progress curve"
            subtitle="Cumulative plan vs actual S-curve"
            accent={PALETTE.teal}
            action={{ label: 'Schedule', onClick: () => onJumpToTab('schedule') }}
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
          <article className={`p-4 ${cardBase}`}>
            <SectionHeader
              icon={<BarChart3 size={15} />}
              title="Delay histogram"
              subtitle="Days behind baseline"
              accent={PALETTE.amber}
              isDark={ex.isDark}
            />
            <div style={{ height: CHART_H_SM }}>
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

          <article className={`p-4 ${cardBase}`}>
            <div className="flex items-center gap-3">
              <div className="relative h-[76px] w-[76px] shrink-0">
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

      {/* Row 2 — monthly velocity + compliance */}
      <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <article className={`p-4 ${cardBase}`}>
          <SectionHeader
            icon={<Activity size={15} />}
            title="Monthly velocity"
            subtitle="Planned vs actual throughput per period"
            accent={PALETTE.indigo}
            isDark={ex.isDark}
          />
          <div style={{ height: CHART_H_SM }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyBars} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barGap={2} barCategoryGap="18%">
                <CartesianGrid strokeDasharray="3 6" stroke={chartGridStroke(ex.isDark)} vertical={false} />
                <XAxis dataKey="month" tick={chartAxisTick(ex.isDark, 9)} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={chartAxisTick(ex.isDark, 10)} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={chartTooltipStyle(ex.isDark)} formatter={(v: number) => [`${v}%`, '']} />
                <Bar dataKey="planned" fill={PALETTE.indigo} radius={[4, 4, 0, 0]} maxBarSize={18} name="Planned" />
                <Bar dataKey="actual" fill={PALETTE.teal} radius={[4, 4, 0, 0]} maxBarSize={18} name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend
            items={[
              { label: 'Monthly planned', color: PALETTE.indigo },
              { label: 'Monthly actual', color: PALETTE.teal },
            ]}
          />
        </article>

        <article className={`p-4 ${cardBase}`}>
          <SectionHeader
            icon={<Shield size={15} />}
            title="Compliance pulse"
            subtitle="Governance score by area"
            accent={PALETTE.emerald}
            action={{ label: 'Details', onClick: () => onJumpToTab('compliance') }}
            isDark={ex.isDark}
          />
          <div style={{ height: CHART_H_SM }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complianceBars} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 6" stroke={chartGridStroke(ex.isDark)} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="name" tick={chartAxisTick(ex.isDark, 10)} axisLine={false} tickLine={false} width={72} />
                <Tooltip contentStyle={chartTooltipStyle(ex.isDark)} formatter={(v: number) => [`${v}%`, 'Score']} />
                <Bar dataKey="score" radius={[0, 8, 8, 0]} maxBarSize={16}>
                  {complianceBars.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      {/* Row 3 — financial, timeline, actions */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <article
          className={`lg:col-span-3 p-4 ${cardBase} ${
            ex.isDark
              ? 'bg-gradient-to-br from-indigo-950/40 via-[#0b1d36]/98 to-[#071428]/90'
              : 'bg-gradient-to-br from-indigo-50/80 via-white to-slate-50/90'
          }`}
        >
          <SectionHeader
            icon={<IndianRupee size={15} />}
            title="Financial"
            subtitle="Contract value & CPI"
            accent={PALETTE.indigo}
            action={{ label: 'Money', onClick: () => onJumpToTab('money') }}
            isDark={ex.isDark}
          />
          <div className="flex items-center gap-3">
            <div className="relative h-[92px] w-[92px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={cpiPie} innerRadius={30} outerRadius={42} dataKey="value" startAngle={90} endAngle={-270} stroke="none">
                    {cpiPie.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-base font-black ${ex.headingStrong}`}>{cpiDisplay}</span>
                <span className={`text-[8px] font-bold uppercase ${ex.label}`}>CPI</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-[10px] font-bold uppercase ${ex.label}`}>Contract value</p>
              <p className={`truncate text-xl font-black ${ex.headingStrong}`}>{metrics.contractValueLabel}</p>
              <p
                className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${
                  metrics.cpiPct >= 100
                    ? ex.isDark
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-emerald-50 text-emerald-700'
                    : metrics.cpiPct > 0
                      ? ex.isDark
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-amber-50 text-amber-700'
                      : ex.isDark
                        ? 'bg-slate-500/15 text-slate-400'
                        : 'bg-slate-100 text-slate-500'
                }`}
              >
                {metrics.cpiPct >= 100 ? 'On track' : metrics.cpiPct > 0 ? 'Review variance' : 'Awaiting data'}
              </p>
            </div>
          </div>
        </article>

        <article className={`lg:col-span-5 p-4 ${cardBase}`}>
          <SectionHeader
            icon={<Calendar size={15} />}
            title="Schedule timeline"
            subtitle="SCL & contractor milestones"
            accent={PALETTE.sky}
            action={{ label: 'Open', onClick: () => onJumpToTab('schedule') }}
            isDark={ex.isDark}
          />
          <PMCExecutiveTimeline
            scl={sclDates}
            contractor={contractorDates}
            className="!rounded-xl !shadow-none !border-0 [&>div:first-child]:hidden [&>div:last-child]:p-2 sm:[&>div:last-child]:p-2.5 [&>div:last-child]:space-y-4"
          />
        </article>

        <article className={`lg:col-span-4 p-4 ${cardBase}`}>
          <SectionHeader
            icon={<AlertTriangle size={15} />}
            title="Decision queue"
            subtitle={`${decisionQueue.filter((d) => d.id !== 'clear').length} items need attention`}
            accent={PALETTE.rose}
            action={{ label: 'Risk', onClick: () => onJumpToTab('risk') }}
            isDark={ex.isDark}
          />
          <ul className="space-y-2">
            {decisionQueue.slice(0, 4).map((item) =>
              item.id === 'clear' ? (
                <li
                  key={item.id}
                  className={`rounded-xl border border-dashed px-3 py-4 text-center text-[11px] font-medium ${
                    ex.isDark ? 'border-white/15 text-slate-400' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {item.title}
                </li>
              ) : (
                <li
                  key={item.id}
                  className={`flex items-start justify-between gap-2 rounded-xl border px-3 py-2.5 transition hover:shadow-sm ${
                    ex.isDark ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]' : 'border-slate-100 bg-white hover:border-slate-200'
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
                      onClick={() => onJumpToTab(item.tab)}
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
