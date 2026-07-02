import React from 'react';
import type { PlannedEarnedPartyMetrics } from '../services/api';
import {
  KPI_METRIC_COLORS,
  performanceBarFillClass,
  performanceStatusBadgeClass,
  semanticValueClass,
} from '../utils/dashboardSemanticColors';
import { formatIndianCurrencyCompact } from '../utils/format';
import {
  getPlanDeltaHelperText,
  getPlannedEarnedPerformanceStatus,
  getPlannedEarnedProgressTone,
} from '../utils/plannedEarnedValue';
import { getThemeClasses, useTheme } from '../utils/theme';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';

interface PlannedEarnedSectionProps {
  title: string;
  data: PlannedEarnedPartyMetrics | null;
  isLoading?: boolean;
  emptyMessage?: string;
}

const PlannedEarnedSection: React.FC<PlannedEarnedSectionProps> = ({
  title,
  data,
  isLoading = false,
  emptyMessage = 'No data available',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();

  if (isLoading) {
    return (
      <div className="space-y-3 py-1">
        <div className={`h-4 w-16 animate-pulse rounded ${themeClasses.bgSecondary}`} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={`h-[52px] animate-pulse rounded-lg ${themeClasses.bgSecondary}`} />
          ))}
        </div>
        <div className={`h-28 animate-pulse rounded-xl ${themeClasses.bgSecondary}`} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-2">
        <h4 className={`mb-2 ${typo.chartSubtitle} ${isDarkTheme ? 'text-blue-300' : 'text-blue-700'}`}>
          {title}
        </h4>
        <p className={`${typo.labelBold} ${themeClasses.textMuted}`}>{emptyMessage}</p>
      </div>
    );
  }

  const performancePercent = data.performancePercentage;
  const status = getPlannedEarnedPerformanceStatus(performancePercent);
  const progressTone = getPlannedEarnedProgressTone(performancePercent);
  const barWidth = Math.min(100, Math.max(0, performancePercent));
  const helperText = getPlanDeltaHelperText(performancePercent);

  const metrics = [
    {
      label: 'Planned Value',
      value: formatIndianCurrencyCompact(data.plannedValue),
      valueClassName: KPI_METRIC_COLORS.primary,
    },
    {
      label: 'Actual Value',
      value: formatIndianCurrencyCompact(data.earnedValue),
      valueClassName: KPI_METRIC_COLORS.primary,
    },
    {
      label: 'Variance',
      value: formatIndianCurrencyCompact(data.variance, { showSign: true }),
      valueClassName: data.variance >= 0 ? KPI_METRIC_COLORS.positive : KPI_METRIC_COLORS.negative,
    },
  ] as const;

  return (
    <div className="relative py-1">
      <h4 className={`mb-2.5 ${typo.chartSubtitle} ${isDarkTheme ? 'text-blue-300' : 'text-blue-700'}`}>
        {title}
      </h4>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`rounded-lg border px-2 py-2.5 text-center transition-shadow hover:shadow-sm ${
              isDarkTheme ? `${themeClasses.border} ${themeClasses.bgSecondary}` : 'border-slate-200 bg-slate-50'
            }`}
          >
            <p className={`${typo.metricLabel} ${themeClasses.textMuted}`}>
              {metric.label}
            </p>
            <p className={`${typo.metricValue} ${metric.valueClassName}`}>
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div
        className={`mt-3 rounded-xl border px-4 py-4 ${
          isDarkTheme ? `${themeClasses.border} bg-white/[0.03]` : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div>
            <p className={`${typo.performancePct} ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
              {performancePercent.toFixed(1)}%
            </p>
            <p className={`mt-2 ${typo.performanceLabel} ${themeClasses.textMuted}`}>
              Schedule Performance Index
            </p>
          </div>
          <span
            className={`mt-2 inline-flex rounded-full px-3 py-1 sm:mt-0 ${typo.badge} ${performanceStatusBadgeClass(status.tone, isDarkTheme)}`}
          >
            {status.label}
          </span>
        </div>

        <div className="mt-4">
          <div className="relative w-full pr-11">
            <div className={`relative h-1.5 w-full rounded-full ${isDarkTheme ? 'bg-slate-700/60' : 'bg-slate-100'}`}>
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${performanceBarFillClass(progressTone)}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span className={`absolute right-0 top-0 ${typo.progressPct} ${themeClasses.textSecondary}`}>
              {performancePercent.toFixed(1)}%
            </span>
          </div>
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
        </div>
      </div>

    </div>
  );
};

export default React.memo(PlannedEarnedSection);
