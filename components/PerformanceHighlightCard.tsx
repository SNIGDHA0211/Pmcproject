import React from 'react';
import DashboardCardTopAccent from './DashboardCardTopAccent';
import { getThemeClasses, useTheme } from '../utils/theme';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';
import { FullScreenHeaderToolbar, useFullScreenCardActions } from './FullScreenCard';
import {
  KPI_METRIC_COLORS,
  kpiMetricColor,
  performanceBarFillClass,
  performanceStatusBadgeClass,
  semanticValueClass,
} from '../utils/dashboardSemanticColors';

export type PerformanceStatusTone = 'success' | 'warning' | 'attention' | 'moderate' | 'danger';

export interface PerformanceMetricBox {
  label: string;
  value: string;
  valueClassName?: string;
}

export interface PerformanceStatus {
  label: string;
  tone: PerformanceStatusTone;
}

/** @deprecated Import from utils/dashboardSemanticColors — re-exported for compatibility */
export { KPI_METRIC_COLORS };

export function getSchedulePerformanceStatus(pct: number): PerformanceStatus {
  if (pct >= 100) return { label: 'ON TRACK', tone: 'success' };
  if (pct >= 90) return { label: 'ON TRACK', tone: 'success' };
  if (pct >= 75) return { label: 'AT RISK', tone: 'warning' };
  return { label: 'BEHIND', tone: 'attention' };
}

export function getCostPerformanceStatus(cpiPct: number): PerformanceStatus {
  if (cpiPct >= 100) return { label: 'ON TRACK', tone: 'success' };
  if (cpiPct >= 80) return { label: 'WARNING', tone: 'warning' };
  if (cpiPct >= 60) return { label: 'NEEDS ATTENTION', tone: 'attention' };
  return { label: 'CRITICAL', tone: 'attention' };
}

export function getCollectionPerformanceStatus(pct: number): PerformanceStatus {
  if (pct >= 100) return { label: 'ON TRACK', tone: 'success' };
  if (pct >= 90) return { label: 'GOOD', tone: 'success' };
  if (pct >= 75) return { label: 'MODERATE', tone: 'moderate' };
  return { label: 'NEEDS ATTENTION', tone: 'attention' };
}

export function getQualityPerformanceStatus(pct: number): PerformanceStatus {
  if (pct >= 95) return { label: 'EXCELLENT', tone: 'success' };
  if (pct >= 80) return { label: 'GOOD', tone: 'success' };
  if (pct >= 60) return { label: 'MODERATE', tone: 'moderate' };
  return { label: 'NEEDS ATTENTION', tone: 'attention' };
}

interface PerformanceProgressBarProps {
  percent: number;
  tone: PerformanceStatusTone;
  isDarkTheme: boolean;
}

const PerformanceProgressBar: React.FC<PerformanceProgressBarProps> = ({ percent, tone, isDarkTheme }) => {
  const typo = useProjectsDashboardTypo();
  const position = Math.min(100, Math.max(0, percent));
  const trackClass = isDarkTheme ? 'bg-slate-700/60' : 'bg-slate-100';

  return (
    <div className="relative w-full pt-1 pr-11">
      <div className={`relative h-1.5 w-full rounded-full ${trackClass}`}>
        {tone === 'success' ? (
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${performanceBarFillClass('success')}`}
            style={{ width: `${position}%` }}
          />
        ) : tone === 'danger' ? (
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${performanceBarFillClass('danger')}`}
            style={{ width: `${position}%` }}
          />
        ) : tone === 'warning' ? (
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${performanceBarFillClass('warning')}`}
            style={{ width: `${position}%` }}
          />
        ) : (
          <>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#059669] via-orange-400 to-[#E11D48] opacity-45" />
            <div
              className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 shadow-sm ${
                isDarkTheme ? 'border-slate-800 bg-slate-300' : 'border-white bg-[#1E293B]'
              }`}
              style={{ left: `calc(${position}% - 5px)` }}
            />
          </>
        )}
      </div>
      <span className={`absolute right-0 top-0 ${typo.progressPct} ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`}>
        {percent.toFixed(1)}%
      </span>
    </div>
  );
};

interface PerformanceHighlightCardProps {
  className?: string;
  title: string;
  /** Shown below title (e.g. metric category) — keeps the main title short and readable */
  subtitle?: string;
  icon: React.ReactNode;
  metrics: [PerformanceMetricBox, PerformanceMetricBox, PerformanceMetricBox];
  performancePercent: number;
  performanceLabel: string;
  status: PerformanceStatus;
  headerActions?: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  isEmpty?: boolean;
  helperText?: string;
  progressTone?: PerformanceStatusTone;
  /** Semi-transparent overlay on body content (header stays visible); underlying values remain faintly visible */
  showTbdOverlay?: boolean;
}

const PerformanceHighlightCard: React.FC<PerformanceHighlightCardProps> = ({
  className = '',
  title,
  subtitle,
  icon,
  metrics,
  performancePercent,
  performanceLabel,
  status,
  headerActions,
  isLoading = false,
  error,
  emptyMessage = 'No data available',
  isEmpty = false,
  helperText,
  progressTone,
  showTbdOverlay = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const fsActions = useFullScreenCardActions();

  return (
    <div
      className={`${className} relative font-['Inter',sans-serif] p-0 rounded-2xl border overflow-hidden flex flex-col h-full min-h-[320px] ${
        isDarkTheme
          ? `${themeClasses.glassCard} ${themeClasses.border} shadow-sm`
          : 'bg-white border-slate-200 shadow-[0_6px_20px_rgba(15,23,42,0.06)]'
      }`}
    >
      <DashboardCardTopAccent />
      <div
        className={`flex shrink-0 items-center justify-between gap-2.5 border-b px-4 py-3 ${
          isDarkTheme ? themeClasses.border : 'border-slate-200'
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${
              isDarkTheme ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-700'
            }`}
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className={typo.cardTitle}>{title}</h3>
            {subtitle ? (
              <p
                className={`mt-0.5 line-clamp-2 ${typo.labelBold} leading-snug ${
                  isDarkTheme ? themeClasses.textMuted : 'text-slate-500'
                }`}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {(headerActions || fsActions) && (
          <FullScreenHeaderToolbar>{headerActions}</FullScreenHeaderToolbar>
        )}
      </div>

      <div className="relative flex flex-1 flex-col p-4 pt-3">
        {isLoading ? (
          <div className="flex flex-1 flex-col gap-3">
            <div className="grid grid-cols-3 gap-2.5">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className={`animate-pulse h-[52px] rounded-lg ${themeClasses.bgSecondary}`} />
              ))}
            </div>
            <div className={`animate-pulse flex-1 rounded-xl ${themeClasses.bgSecondary}`} />
            <div className={`animate-pulse h-2 rounded-full ${themeClasses.bgSecondary}`} />
          </div>
        ) : error ? (
          <div className={`flex flex-1 items-center justify-center text-center ${typo.error}`}>{error}</div>
        ) : isEmpty ? (
          <div
            className={`flex flex-1 items-center justify-center text-center ${typo.empty} ${
              isDarkTheme ? themeClasses.textMuted : 'text-slate-500'
            }`}
          >
            {emptyMessage}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 shrink-0">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className={`rounded-lg border px-2 py-2 text-center ${
                    isDarkTheme ? `${themeClasses.border} ${themeClasses.bgSecondary}` : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <p
                    className={`${typo.metricLabel} ${
                      isDarkTheme ? themeClasses.textMuted : 'text-slate-500'
                    }`}
                  >
                    {metric.label}
                  </p>
                  <p
                    className={`${typo.metricValue} ${
                      metric.valueClassName ||
                      kpiMetricColor('primary', isDarkTheme)
                    }`}
                  >
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>

            <div
              className={`mt-3 flex flex-1 flex-col rounded-xl border px-4 py-3.5 ${
                isDarkTheme ? `${themeClasses.border} bg-white/[0.03]` : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <p className={`${typo.performancePct} ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                  {performancePercent.toFixed(1)}%
                </p>
                <p
                  className={`${typo.performanceLabel} ${
                    isDarkTheme ? themeClasses.textMuted : 'text-slate-500'
                  }`}
                >
                  {performanceLabel}
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 ${typo.badge} ${performanceStatusBadgeClass(status.tone, isDarkTheme)}`}
                >
                  {status.label}
                </span>
              </div>

              <div className="mt-4 shrink-0">
                <PerformanceProgressBar
                  percent={performancePercent}
                  tone={progressTone ?? status.tone}
                  isDarkTheme={isDarkTheme}
                />
                {helperText && (
                  <p
                    className={`mt-2 ${typo.helper} ${
                      performancePercent >= 100
                        ? semanticValueClass('positive', isDarkTheme)
                        : performancePercent >= 90
                          ? semanticValueClass('warning', isDarkTheme)
                          : semanticValueClass('negative', isDarkTheme)
                    }`}
                  >
                    {helperText}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {showTbdOverlay && !isLoading && !error && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-b-2xl bg-black/55 pointer-events-none"
            aria-hidden
          >
            <span className="text-3xl font-black uppercase tracking-[0.35em] text-white drop-shadow-sm">TBD</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(PerformanceHighlightCard);
