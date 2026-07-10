import React from 'react';
import { Activity, CheckCircle2, Layers, TrendingUp, Wallet } from 'lucide-react';
import type { PlannedEarnedPartyMetrics } from '../services/api';
import { formatIndianCurrencyCompact, formatIndianCurrencyFull } from '../utils/format';
import {
  getGrowthSemanticTone,
  semanticBadgeClass,
  semanticBarFillClass,
  semanticBorderAccentClass,
  semanticIconWrapClass,
  semanticValueClass,
} from '../utils/dashboardSemanticColors';
import { getPlanDeltaHelperText } from '../utils/plannedEarnedValue';
import { DASHBOARD_NEUTRAL_VALUE_CLASS, getThemeClasses, useTheme } from '../utils/theme';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';
import { PvaVarianceBadge } from './plannedVsActual/PvaVarianceBadge';

const KPI_TILE_MIN_H = 'min-h-[5.5rem]';

export const PlannedEarnedSectionBody: React.FC<{
  data: PlannedEarnedPartyMetrics | null;
  isLoading: boolean;
  error?: string | null;
  emptyMessage?: string;
  /** Tighter KPI grid for side-by-side SCL | Contractor layout */
  compact?: boolean;
}> = ({ data, isLoading, error = null, emptyMessage = 'No planned vs actual data', compact = false }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();

  if (isLoading) {
    return (
      <div className={`animate-pulse h-[180px] rounded-lg ${themeClasses.bgSecondary}`} aria-label="Loading planned vs actual value" />
    );
  }
  if (error) {
    return <p className={`flex min-h-[100px] items-center ${typo.bodyBold} text-rose-500`}>{error}</p>;
  }
  if (!data) {
    return (
      <p className={`flex min-h-[100px] items-center ${typo.labelBold} ${themeClasses.textMuted}`}>
        {emptyMessage}
      </p>
    );
  }

  const performancePercentage = data.performancePercentage ?? 0;
  const variance = data.difference ?? data.variance ?? 0;
  const hasCollection = data.collection != null;
  const barFillPercent = Math.min(100, Math.max(0, performancePercentage));
  const performanceTone = getGrowthSemanticTone(performancePercentage - 100);
  const pctTone = semanticValueClass(performanceTone, isDarkTheme);
  const barClass = semanticBarFillClass(performanceTone);
  const performanceBadgeClass = semanticBadgeClass(performanceTone, isDarkTheme);

  const neutralValue = DASHBOARD_NEUTRAL_VALUE_CLASS(isDarkTheme);
  const positiveValue = semanticValueClass('positive', isDarkTheme);
  const negativeValue = semanticValueClass('negative', isDarkTheme);
  const varianceTone = variance >= 0 ? 'positive' : 'negative';

  const metrics = [
    {
      label: 'Planned Value',
      display: formatIndianCurrencyCompact(data.plannedValue),
      full: formatIndianCurrencyFull(data.plannedValue),
      icon: Layers,
      border: semanticBorderAccentClass('neutral'),
      iconBg: semanticIconWrapClass('neutral', isDarkTheme),
      valueClass: neutralValue,
    },
    {
      label: 'Actual Value',
      display: formatIndianCurrencyCompact(data.earnedValue),
      full: formatIndianCurrencyFull(data.earnedValue),
      icon: CheckCircle2,
      border: semanticBorderAccentClass('positive'),
      iconBg: semanticIconWrapClass('positive', isDarkTheme),
      valueClass: positiveValue,
    },
    ...(hasCollection
      ? [
          {
            label: 'Collection',
            display: formatIndianCurrencyCompact(data.collection ?? 0),
            full: formatIndianCurrencyFull(data.collection ?? 0),
            icon: Wallet,
            border: semanticBorderAccentClass('neutral'),
            iconBg: semanticIconWrapClass('neutral', isDarkTheme),
            valueClass: neutralValue,
          },
        ]
      : []),
    {
      label: 'Difference',
      display: formatIndianCurrencyCompact(variance, { showSign: true }),
      full: formatIndianCurrencyFull(variance),
      icon: TrendingUp,
      border: semanticBorderAccentClass(varianceTone),
      iconBg: semanticIconWrapClass(varianceTone, isDarkTheme),
      valueClass: variance >= 0 ? positiveValue : negativeValue,
    },
    {
      label: hasCollection ? 'Achievement %' : 'Schedule Performance',
      display: `${performancePercentage.toFixed(0)}%`,
      full: `${performancePercentage.toFixed(1)}%`,
      icon: Activity,
      border: semanticBorderAccentClass(
        performancePercentage >= 100 ? 'positive' : performancePercentage >= 90 ? 'warning' : 'negative',
      ),
      iconBg: semanticIconWrapClass(
        performancePercentage >= 100 ? 'positive' : performancePercentage >= 90 ? 'warning' : 'negative',
        isDarkTheme,
      ),
      valueClass: pctTone,
    },
  ];

  const deltaLabel = getPlanDeltaHelperText(performancePercentage);

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`grid gap-3 ${
          compact
            ? 'grid-cols-2'
            : 'grid-cols-1 min-[380px]:grid-cols-2 2xl:grid-cols-4'
        }`}
      >
        {metrics.map(({ label, display, full, icon: Icon, border, iconBg, valueClass }) => (
          <div
            key={label}
            className={`flex ${KPI_TILE_MIN_H} min-w-0 flex-col overflow-hidden rounded-lg border border-b-[3px] px-2.5 py-2.5 ${border} ${
              isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex min-w-0 flex-col gap-1">
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${iconBg}`}>
                <Icon size={11} strokeWidth={2.5} />
              </div>
              <p className={`${typo.financialKpiLabel} ${themeClasses.textMuted}`}>{label}</p>
            </div>
            <p className={`mt-auto pt-2 truncate ${typo.compactValue} ${valueClass}`} title={full}>
              {display}
            </p>
          </div>
        ))}
      </div>

      <div className={`rounded-xl border px-3.5 py-3 ${themeClasses.border} ${isDarkTheme ? 'bg-white/5' : 'bg-slate-50'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`${typo.labelBold} tracking-wide ${themeClasses.textPrimary}`}>
              {hasCollection ? 'Achievement %' : 'Schedule Performance Index'}
            </p>
            <p className={`${typo.micro} ${themeClasses.textMuted}`}>
              Actual Value vs Planned Value
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={`pl-1 font-black ${typo.performancePct} ${pctTone}`}>
              {performancePercentage.toFixed(0)}%
            </span>
            {data.varianceStatus && (
              <PvaVarianceBadge status={data.varianceStatus} isDark={isDarkTheme} />
            )}
          </div>
        </div>
        <div className={`mt-2 h-2 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'}`}>
          <div className={`h-full rounded-full ${barClass}`} style={{ width: `${barFillPercent}%` }} />
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span
            className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 ${typo.microBold} ${performanceBadgeClass}`}
          >
            <span aria-hidden className={typo.caption}>
              {performancePercentage >= 100 ? '▲' : '▼'}
            </span>
            {deltaLabel}
          </span>
          {hasCollection && data.collectionPct != null ? (
            <span className={`${typo.micro} ${themeClasses.textMuted}`}>
              Collection {Number(data.collectionPct).toFixed(1)}%
            </span>
          ) : (
            <span className={`${typo.micro} ${themeClasses.textMuted}`}>
              Performance against planned value
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface PlannedEarnedSectionProps {
  title: string;
  data: PlannedEarnedPartyMetrics | null;
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  compact?: boolean;
  /** Visual tone for the section heading */
  titleTone?: 'default' | 'scl' | 'contractor';
}

const PlannedEarnedSection: React.FC<PlannedEarnedSectionProps> = ({
  title,
  data,
  isLoading = false,
  error = null,
  emptyMessage = 'No data available',
  compact = false,
  titleTone = 'default',
}) => {
  const typo = useProjectsDashboardTypo();
  const { isDarkTheme } = useTheme();

  const titleStyle =
    titleTone === 'contractor'
      ? isDarkTheme
        ? { color: '#f0fdfa', backgroundColor: 'rgba(45, 212, 191, 0.28)', borderColor: 'rgba(45, 212, 191, 0.55)' }
        : { color: '#134e4a', backgroundColor: '#ccfbf1', borderColor: '#0f766e' }
      : titleTone === 'scl'
        ? isDarkTheme
          ? { color: '#f8fafc', backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.28)' }
          : { color: '#0f172a', backgroundColor: '#f1f5f9', borderColor: '#334155' }
        : undefined;

  const titleClass =
    titleTone === 'contractor' || titleTone === 'scl'
      ? 'w-full rounded-md border-2 px-2.5 py-2 text-[11px] font-black uppercase leading-snug tracking-wide'
      : `embedded-section-title min-w-0 break-words ${typo.embeddedSectionTitle}`;

  return (
    <div className="flex flex-1 flex-col justify-center px-0 py-3 sm:px-1 sm:py-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h4 className={titleClass} style={titleStyle}>
          {title}
        </h4>
      </div>
      <PlannedEarnedSectionBody
        data={data}
        isLoading={isLoading}
        error={error}
        emptyMessage={emptyMessage}
        compact={compact}
      />
    </div>
  );
};

export default React.memo(PlannedEarnedSection);
