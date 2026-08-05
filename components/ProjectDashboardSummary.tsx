import React from 'react';
import {
  Activity,
  Rocket,
  Calendar,
  AlertTriangle,
  Shield,
  FileText,
} from 'lucide-react';
import { getThemeClasses, useTheme } from '../utils/theme';
import { semanticValueClass } from '../utils/dashboardSemanticColors';
import type { HealthSafetyStatusLevel } from '../utils/healthSafety';

/** Fixed typography for the top summary strip — isolated from dashboard-wide scale changes. */
const SUMMARY_KPI_TITLE_CLASS = 'text-[9px] font-black uppercase tracking-[0.06em]';
const SUMMARY_KPI_VALUE_CLASS = 'text-lg font-bold leading-tight';
const SUMMARY_KPI_SUB_CLASS = 'text-[10px] font-semibold';
const SUMMARY_KPI_ICON_WRAP_CLASS = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full';

export type ProjectHealthTone = 'good' | 'warn' | 'bad';

export interface HealthSafetySummaryStatus {
  label: 'SAFE' | 'WARNING' | 'CRITICAL';
  level: HealthSafetyStatusLevel;
  sublabel: string;
}

export interface ProjectDashboardSummaryProps {
  projectHealth: { label: string; sublabel: string; tone: ProjectHealthTone };
  overallProgressPct: number;
  progressDeltaLabel?: string;
  progressSparkline?: number[];
  delayDays: number;
  criticalRisks: number;
  healthSafetyStatus: HealthSafetySummaryStatus;
  drawingApprovalPct: number;
}

const HEALTH_STYLES: Record<
  ProjectHealthTone,
  { iconBg: string; value: string; dot: string }
> = {
  good: {
    iconBg: 'bg-emerald-100 text-[#059669]',
    value: 'text-[#1E293B]',
    dot: 'bg-[#059669]',
  },
  warn: {
    iconBg: 'bg-orange-100 text-orange-600',
    value: 'text-[#1E293B]',
    dot: 'bg-orange-500',
  },
  bad: {
    iconBg: 'bg-rose-100 text-[#E11D48]',
    value: 'text-[#E11D48]',
    dot: 'bg-[#E11D48]',
  },
};

const HSE_STYLES: Record<
  HealthSafetyStatusLevel,
  { iconBg: string; value: string; dot: string; darkIconBg: string; darkValue: string }
> = {
  safe: {
    iconBg: 'bg-emerald-100 text-[#059669]',
    value: 'text-[#059669]',
    dot: 'bg-[#059669]',
    darkIconBg: 'bg-emerald-500/15 text-emerald-400',
    darkValue: 'text-emerald-400',
  },
  warning: {
    iconBg: 'bg-orange-100 text-orange-600',
    value: 'text-orange-600',
    dot: 'bg-orange-500',
    darkIconBg: 'bg-orange-500/15 text-orange-400',
    darkValue: 'text-orange-400',
  },
  critical: {
    iconBg: 'bg-rose-100 text-[#E11D48]',
    value: 'text-[#E11D48]',
    dot: 'bg-[#E11D48]',
    darkIconBg: 'bg-rose-500/15 text-rose-400',
    darkValue: 'text-rose-400',
  },
};

function MiniSparkline({ values, stroke = '#2563eb' }: { values: number[]; stroke?: string }) {
  if (!values.length) return null;
  const w = 52;
  const h = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} className="shrink-0 opacity-90" aria-hidden>
      <polyline fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" points={pts} />
    </svg>
  );
}

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  valueClassName?: string;
  sublabel: React.ReactNode;
  icon: React.ReactNode;
  iconWrapClass: string;
  trailing?: React.ReactNode;
  footer?: React.ReactNode;
  isDarkTheme: boolean;
  borderClass: string;
  glassCard: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  valueClassName = '',
  sublabel,
  icon,
  iconWrapClass,
  trailing,
  footer,
  isDarkTheme,
  borderClass,
  glassCard,
}) => (
  <div
    className={`flex min-h-[88px] flex-col rounded-2xl border p-2.5 shadow-sm sm:min-h-[96px] sm:p-3 ${glassCard} ${borderClass}`}
  >
    <div className="flex items-start justify-between gap-1.5">
      <div className={`${SUMMARY_KPI_ICON_WRAP_CLASS} ${iconWrapClass}`}>{icon}</div>
      {trailing}
    </div>
    <p
      className={`mt-1.5 ${SUMMARY_KPI_TITLE_CLASS} ${
        isDarkTheme ? 'text-slate-400' : 'text-slate-500'
      }`}
    >
      {title}
    </p>
    <p className={`mt-0.5 ${SUMMARY_KPI_VALUE_CLASS} ${valueClassName}`}>{value}</p>
    <div className="mt-1">{sublabel}</div>
    {footer}
  </div>
);

const ProjectDashboardSummary: React.FC<ProjectDashboardSummaryProps> = ({
  projectHealth,
  overallProgressPct,
  progressDeltaLabel,
  progressSparkline = [],
  delayDays,
  criticalRisks,
  healthSafetyStatus,
  drawingApprovalPct,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const healthStyle = HEALTH_STYLES[projectHealth.tone];
  const hseStyle = HSE_STYLES[healthSafetyStatus.level];

  const progressRounded = Math.round(Math.min(100, Math.max(0, overallProgressPct)));
  const drawingRounded = Math.round(Math.min(100, Math.max(0, drawingApprovalPct)));
  const delayDisplay = Math.round(Math.abs(delayDays));

  const drawingOnTrack = drawingRounded >= 75;

  return (
    <div className="grid grid-cols-1 items-stretch gap-2.5 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 xl:gap-3">
      <KpiCard
        title="Project Health"
        value={projectHealth.label}
        valueClassName={isDarkTheme ? 'text-white' : healthStyle.value}
        icon={<Activity size={16} strokeWidth={2.5} />}
        iconWrapClass={isDarkTheme ? 'bg-emerald-500/15 text-emerald-400' : healthStyle.iconBg}
        isDarkTheme={isDarkTheme}
        borderClass={themeClasses.border}
        glassCard={themeClasses.glassCard}
        sublabel={
          <p
            className={`flex items-center gap-1.5 ${SUMMARY_KPI_SUB_CLASS} ${
              isDarkTheme ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${healthStyle.dot}`} />
            {projectHealth.sublabel}
          </p>
        }
      />

      <KpiCard
        title="Overall Progress"
        value={`${progressRounded}%`}
        valueClassName={isDarkTheme ? 'text-white' : 'text-[#1E293B]'}
        icon={<Rocket size={16} strokeWidth={2.5} />}
        iconWrapClass={isDarkTheme ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-100 text-blue-600'}
        trailing={<MiniSparkline values={progressSparkline} />}
        isDarkTheme={isDarkTheme}
        borderClass={themeClasses.border}
        glassCard={themeClasses.glassCard}
        sublabel={
          <p className={`${SUMMARY_KPI_SUB_CLASS} ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
            {progressDeltaLabel ?? 'Physical progress to date'}
          </p>
        }
      />

      <KpiCard
        title="Delay"
        value={delayDisplay}
        valueClassName={isDarkTheme ? 'text-rose-400' : 'text-[#E11D48]'}
        icon={<Calendar size={16} strokeWidth={2.5} />}
        iconWrapClass={isDarkTheme ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-100 text-[#E11D48]'}
        isDarkTheme={isDarkTheme}
        borderClass={themeClasses.border}
        glassCard={themeClasses.glassCard}
        sublabel={
          <p className={`${SUMMARY_KPI_SUB_CLASS} ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
            Days behind schedule
          </p>
        }
      />

      <KpiCard
        title="Critical Risks"
        value={criticalRisks}
        valueClassName={isDarkTheme ? 'text-rose-400' : 'text-[#E11D48]'}
        icon={<AlertTriangle size={16} strokeWidth={2.5} />}
        iconWrapClass={isDarkTheme ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-100 text-[#E11D48]'}
        isDarkTheme={isDarkTheme}
        borderClass={themeClasses.border}
        glassCard={themeClasses.glassCard}
        sublabel={
          <p
            className={`flex items-center gap-1 ${SUMMARY_KPI_SUB_CLASS} ${
              isDarkTheme ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Requires attention
            {criticalRisks > 0 && <span className="text-rose-500">*</span>}
          </p>
        }
      />

      <KpiCard
        title="Health & Safety"
        value={
          healthSafetyStatus.sublabel === 'No HSE data' ? '—' : healthSafetyStatus.label
        }
        valueClassName={
          healthSafetyStatus.sublabel === 'No HSE data'
            ? isDarkTheme
              ? 'text-slate-400'
              : 'text-slate-500'
            : isDarkTheme
              ? hseStyle.darkValue
              : hseStyle.value
        }
        icon={<Shield size={16} strokeWidth={2.5} />}
        iconWrapClass={
          healthSafetyStatus.sublabel === 'No HSE data'
            ? isDarkTheme
              ? 'bg-white/10 text-slate-400'
              : 'bg-slate-100 text-slate-500'
            : isDarkTheme
              ? hseStyle.darkIconBg
              : hseStyle.iconBg
        }
        isDarkTheme={isDarkTheme}
        borderClass={themeClasses.border}
        glassCard={themeClasses.glassCard}
        sublabel={
          <p
            className={`flex items-center gap-1.5 ${SUMMARY_KPI_SUB_CLASS} ${
              isDarkTheme ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {healthSafetyStatus.sublabel !== 'No HSE data' && (
              <span className={`h-1.5 w-1.5 rounded-full ${hseStyle.dot}`} />
            )}
            {healthSafetyStatus.sublabel}
          </p>
        }
      />

      <KpiCard
        title="Drawing Approval"
        value={drawingRounded > 0 ? `${drawingRounded}%` : '—'}
        valueClassName={
          drawingRounded <= 0
            ? isDarkTheme
              ? 'text-slate-400'
              : 'text-slate-500'
            : drawingOnTrack
            ? isDarkTheme
              ? 'text-emerald-400'
              : semanticValueClass('positive', false)
            : isDarkTheme
              ? 'text-orange-400'
              : semanticValueClass('warning', false)
        }
        icon={<FileText size={16} strokeWidth={2.5} />}
        iconWrapClass={
          drawingRounded <= 0
            ? isDarkTheme
              ? 'bg-white/10 text-slate-400'
              : 'bg-slate-100 text-slate-500'
            : drawingOnTrack
            ? isDarkTheme
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-emerald-50 text-[#059669]'
            : isDarkTheme
              ? 'bg-orange-500/15 text-orange-400'
              : 'bg-orange-50 text-orange-600'
        }
        isDarkTheme={isDarkTheme}
        borderClass={themeClasses.border}
        glassCard={themeClasses.glassCard}
        sublabel={
          <p className={`${SUMMARY_KPI_SUB_CLASS} ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
            {drawingRounded <= 0 ? 'No drawing data' : drawingOnTrack ? 'On track' : 'Needs improvement'}
          </p>
        }
        footer={
          <div
            className={`mt-1.5 h-1.5 w-full overflow-hidden rounded-full ${
              isDarkTheme ? 'bg-slate-700/60' : 'bg-slate-100'
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                drawingOnTrack ? 'bg-[#059669]' : 'bg-orange-500'
              }`}
              style={{ width: `${drawingRounded}%` }}
            />
          </div>
        }
      />
    </div>
  );
};

export default ProjectDashboardSummary;
