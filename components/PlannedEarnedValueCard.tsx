import React from 'react';
import type { PlannedEarnedPartyMetrics } from '../services/api';
import { Icons } from './Icons';
import { CardHeaderActions } from './FormulaInfoButton';
import PlannedEarnedSection from './PlannedEarnedSection';
import PerformanceHighlightCard, { KPI_METRIC_COLORS } from './PerformanceHighlightCard';
import { formatIndianCurrencyCompact } from '../utils/format';
import {
  getPlanDeltaHelperText,
  getPlannedEarnedPerformanceStatus,
  getPlannedEarnedProgressTone,
} from '../utils/plannedEarnedValue';
import DashboardCardTopAccent from './DashboardCardTopAccent';
import { DASHBOARD_GROUP_CARD_TITLE_CLASS, getThemeClasses, useTheme } from '../utils/theme';

import { plannedValueSectionTitle } from '../utils/dashboardContractorLabels';

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
  isLoading?: boolean;
  headerActions?: React.ReactNode;
}

/** Group card with SCL and Contractor sections (Contract Values / Invoicing pattern). */
export const PlannedEarnedValueGroupCard: React.FC<PlannedEarnedValueGroupCardProps> = ({
  sclData,
  contractorData,
  isLoading = false,
  headerActions,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const showTbdOverlay = true;

  return (
    <div
      className={`planned-earned-group earned-value-card relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-2xl border p-5 transition-shadow hover:shadow-md md:col-span-2 xl:col-span-2 ${
        isDarkTheme
          ? `${themeClasses.glassCard} ${themeClasses.border} shadow-sm`
          : 'border-slate-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)]'
      }`}
    >
      <DashboardCardTopAccent />
      <div className={`mb-3 flex shrink-0 items-start justify-between gap-3 border-b pb-3 pt-1 ${themeClasses.border}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isDarkTheme ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
            <Icons.Performance size={18} className={isDarkTheme ? 'text-blue-300' : 'text-blue-600'} />
          </div>
          <div className="min-w-0">
            <h3 className={DASHBOARD_GROUP_CARD_TITLE_CLASS(isDarkTheme)}>Planned vs Actual Value</h3>
          </div>
        </div>
        {headerActions && <CardHeaderActions>{headerActions}</CardHeaderActions>}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0">
        <PlannedEarnedSection
          title="SCL"
          data={sclData}
          isLoading={isLoading}
          emptyMessage="No SCL Planned vs Actual data available."
        />
        <div
          className="my-6 shrink-0 border-t border-dashed"
          style={{ borderColor: isDarkTheme ? 'rgba(148,163,184,0.35)' : '#E2E8F0' }}
        />
        <PlannedEarnedSection
          title="CONTRACTOR"
          data={contractorData}
          isLoading={isLoading}
          emptyMessage="No Contractor Planned vs Actual data available."
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
