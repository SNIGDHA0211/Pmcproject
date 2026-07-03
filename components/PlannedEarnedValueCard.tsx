import React from 'react';
import type { PlannedEarnedPartyMetrics } from '../services/api';
import { Icons } from './Icons';
import { CardEditButton, CardHeaderActions } from './FormulaInfoButton';
import PlannedEarnedSection from './PlannedEarnedSection';
import PerformanceHighlightCard, { KPI_METRIC_COLORS } from './PerformanceHighlightCard';
import DashboardCardTopAccent from './DashboardCardTopAccent';
import { formatIndianCurrencyCompact } from '../utils/format';
import {
  getPlanDeltaHelperText,
  getPlannedEarnedPerformanceStatus,
  getPlannedEarnedProgressTone,
} from '../utils/plannedEarnedValue';
import {
  DASHBOARD_CARD_HEADER_ROW_CLASS,
  DASHBOARD_FINANCIAL_CARD_PADDING,
  getThemeClasses,
  useTheme,
} from '../utils/theme';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';

interface PlannedEarnedValueCardProps {
  className?: string;
  sectionTitle: string;
  data: PlannedEarnedPartyMetrics | null;
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  headerActions?: React.ReactNode;
  /** Always-on dim overlay (e.g. dashboard while client reviews this block) */
  showTbdOverlay?: boolean;
}

/** Standalone card matching the dashboard PerformanceHighlightCard layout for one party (SCL or Contractor). */
const PlannedEarnedValueCard: React.FC<PlannedEarnedValueCardProps> = ({
  className = '',
  sectionTitle,
  data,
  isLoading = false,
  error = null,
  emptyMessage,
  headerActions,
  showTbdOverlay = false,
}) => {
  const performancePercent = data?.performancePercentage ?? 0;
  const variance = data?.variance ?? 0;
  const isEmpty = !isLoading && !error && !data;
  const partyLabel = sectionTitle;

  return (
    <PerformanceHighlightCard
      className={className}
      title={partyLabel}
      icon={<Icons.Performance size={14} />}
      performancePercent={performancePercent}
      performanceLabel="Schedule Performance Index"
      status={getPlannedEarnedPerformanceStatus(performancePercent)}
      progressTone={getPlannedEarnedProgressTone(performancePercent)}
      helperText={data ? getPlanDeltaHelperText(performancePercent) : undefined}
      isLoading={isLoading}
      error={error}
      isEmpty={isEmpty}
      emptyMessage={emptyMessage ?? `No ${sectionTitle} data available.`}
      metrics={
        data
          ? [
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
              value: formatIndianCurrencyCompact(variance, { showSign: true }),
              valueClassName: variance >= 0 ? KPI_METRIC_COLORS.positive : KPI_METRIC_COLORS.negative,
            },
          ]
          : [
            { label: 'Planned Value', value: '—', valueClassName: KPI_METRIC_COLORS.primary },
            { label: 'Actual Value', value: '—', valueClassName: KPI_METRIC_COLORS.primary },
            { label: 'Variance', value: '—', valueClassName: KPI_METRIC_COLORS.muted },
          ]
      }
      headerActions={headerActions}
      showTbdOverlay={showTbdOverlay}
    />
  );
};

interface PlannedEarnedValueGroupCardProps {
  sclData: PlannedEarnedPartyMetrics | null;
  contractorData: PlannedEarnedPartyMetrics | null;
  contractorSectionTitle?: string;
  groupSubtitle?: string;
  className?: string;
  isLoading?: boolean;
  sclError?: string | null;
  contractorError?: string | null;
  headerActions?: React.ReactNode;
  onEdit?: () => void;
  showTbdOverlay?: boolean;
}

/** Group card with SCL and Contractor sections (Contract Values / Invoicing pattern). */
export const PlannedEarnedValueGroupCard: React.FC<PlannedEarnedValueGroupCardProps> = ({
  sclData,
  contractorData,
  contractorSectionTitle = 'CONTRACTOR SUMMARY (ALL CONTRACTORS)',
  groupSubtitle,
  className = '',
  isLoading = false,
  sclError = null,
  contractorError = null,
  headerActions,
  onEdit,
  showTbdOverlay = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const subtitle = groupSubtitle ?? 'SCL & Contractor performance';

  return (
    <div
      className={`planned-earned-group earned-value-card relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border ${DASHBOARD_FINANCIAL_CARD_PADDING} transition-shadow hover:shadow-md sm:min-h-[460px] lg:min-h-[520px] md:col-span-2 xl:col-span-2 ${isDarkTheme
        ? `${themeClasses.glassCard} ${themeClasses.border} shadow-sm`
        : 'border-slate-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)]'
        } ${className}`}
    >
      <DashboardCardTopAccent />
      <div className={`mb-3 ${DASHBOARD_CARD_HEADER_ROW_CLASS(themeClasses.border)}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isDarkTheme ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
            <Icons.Performance size={18} className={isDarkTheme ? 'text-blue-300' : 'text-blue-600'} />
          </div>
          <div className="min-w-0">
            <h3 className={typo.financialGroupTitle}>Planned vs Actual Value</h3>
            <p className={typo.financialGroupSubtitle(isDarkTheme)}>{subtitle}</p>
          </div>
        </div>
        {(onEdit || headerActions) && (
          <CardHeaderActions>
            {headerActions}
            {onEdit && <CardEditButton onClick={onEdit} title="Edit in Financial Management" />}
          </CardHeaderActions>
        )}
      </div>

      <div className={`flex min-h-0 flex-1 flex-col divide-y divide-dashed ${themeClasses.border}`}>
        <PlannedEarnedSection
          title="SCL PLANNED VS ACTUAL VALUE"
          data={sclData}
          isLoading={isLoading}
          error={sclError}
          emptyMessage="No SCL planned vs actual data available."
        />
        <PlannedEarnedSection
          title={contractorSectionTitle}
          data={contractorData}
          isLoading={isLoading}
          error={contractorError}
          emptyMessage="No contractor planned vs actual data available."
        />
      </div>

      {showTbdOverlay && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/55 pointer-events-none"
          aria-hidden
        >
          <span className="text-3xl font-black uppercase tracking-[0.35em] text-white drop-shadow-sm">TBD</span>
        </div>
      )}
    </div>
  );
};

export default React.memo(PlannedEarnedValueCard);
