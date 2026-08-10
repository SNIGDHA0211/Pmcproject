import React from 'react';
import { AlertCircle, ArrowDown, ArrowUp, Clock, FileText } from 'lucide-react';
import { coerceCorrespondenceCount, type CorrespondenceStatusBreakdown } from '../utils/correspondence';
import { FormulaInfoButton } from './FormulaInfoButton';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';
import { DASHBOARD_STATUS_METRIC_LABEL_CLASS, getThemeClasses, useTheme } from '../utils/theme';
import {
  semanticBorderAccentClass,
  semanticIconWrapClass,
  semanticValueClass,
} from '../utils/dashboardSemanticColors';

interface CorrespondenceMetricStripProps {
  breakdown: CorrespondenceStatusBreakdown;
  compact?: boolean;
  split?: boolean;
}

const KPI_TILE_MIN_H = 'min-h-[5.25rem] sm:min-h-[5.5rem]';
const KPI_TILE_MIN_H_COMPACT = 'min-h-[4.25rem] sm:min-h-[4.5rem]';

const METRIC_DEFS = [
  {
    key: 'received' as const,
    label: 'Received',
    sublabel: 'Documents',
    icon: ArrowDown,
    tone: 'neutral' as const,
    showInfo: false,
  },
  {
    key: 'delivered' as const,
    label: 'Delivered',
    sublabel: 'Documents',
    icon: ArrowUp,
    tone: 'positive' as const,
    showInfo: false,
  },
  {
    key: 'record' as const,
    label: 'Record',
    sublabel: 'Documents',
    icon: FileText,
    tone: 'neutral' as const,
    showInfo: false,
  },
  {
    key: 'pending' as const,
    label: 'Pending',
    sublabel: 'Documents',
    icon: Clock,
    tone: 'warning' as const,
    showInfo: false,
  },
  {
    key: 'lateDeliveries' as const,
    label: 'Late Deliveries',
    sublabel: 'Documents',
    icon: AlertCircle,
    tone: 'negative' as const,
    showInfo: true,
  },
];

const CorrespondenceMetricStrip: React.FC<CorrespondenceMetricStripProps> = ({
  breakdown,
  compact = false,
  split = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();

  const isDense = compact || split;
  const gridClass = split
    ? 'grid-cols-2'
    : compact
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
      : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5';

  return (
    <div className={`grid gap-2 sm:gap-2.5 ${gridClass}`}>
      {METRIC_DEFS.map((metric) => {
        const Icon = metric.icon;
        const value = coerceCorrespondenceCount(breakdown[metric.key]);
        const border = semanticBorderAccentClass(metric.tone);
        const iconWrap = semanticIconWrapClass(metric.tone, isDarkTheme);
        const valueClass = semanticValueClass(metric.tone, isDarkTheme);
        const spanLate = split && metric.key === 'lateDeliveries';
        return (
          <div
            key={metric.key}
            className={`relative flex ${
              isDense ? KPI_TILE_MIN_H_COMPACT : KPI_TILE_MIN_H
            } flex-col rounded-xl border border-b-[3px] ${border} ${
              spanLate ? 'col-span-2' : ''
            } ${
              isDense
                ? 'px-2.5 py-2'
                : split
                  ? 'px-2.5 py-2 sm:px-3 sm:py-2.5'
                  : 'px-3 py-2.5'
            } ${
              isDarkTheme
                ? 'border-white/10 bg-slate-950/40'
                : 'border-slate-200 bg-white shadow-sm'
            }`}
          >
            {metric.showInfo && (
              <div className="absolute right-1.5 top-1.5 z-10">
                <FormulaInfoButton
                  title="Late Deliveries"
                  calculatedFields={['lateDeliveries']}
                  formulas={[
                    'Late Deliveries are delivered documents submitted after the deadline.',
                  ]}
                  iconSize={12}
                  className="h-5 w-5"
                />
              </div>
            )}
            <div className="flex items-start justify-between gap-2">
              <p
                className={`min-w-0 flex-1 leading-tight line-clamp-2 ${
                  isDense ? 'text-[10px] sm:text-[11px]' : typo.label
                } font-semibold uppercase ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)} ${
                  metric.showInfo ? 'pr-5' : ''
                }`}
              >
                {metric.label}
              </p>
              <span
                className={`flex shrink-0 items-center justify-center rounded-md ${iconWrap} ${
                  isDense ? 'h-7 w-7' : split ? 'h-7 w-7 sm:h-8 sm:w-8' : 'h-8 w-8'
                }`}
              >
                <Icon size={isDense ? 14 : split ? 14 : 16} />
              </span>
            </div>
            <div className="mt-auto pt-1">
              <p
                className={`truncate font-black tabular-nums leading-none ${
                  isDense
                    ? 'text-lg sm:text-xl'
                    : split
                      ? 'text-base sm:text-xl'
                      : 'text-lg sm:text-2xl'
                } ${valueClass}`}
              >
                {value.toLocaleString('en-IN')}
              </p>
              {!isDense && (
                <p className={`mt-0.5 ${typo.caption} font-semibold ${themeClasses.textSecondary}`}>
                  {metric.sublabel}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(CorrespondenceMetricStrip);
