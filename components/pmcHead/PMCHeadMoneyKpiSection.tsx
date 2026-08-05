import React from 'react';
import { Activity, FileText } from 'lucide-react';
import { PlannedEarnedValueGroupCard } from '../PlannedEarnedValueCard';
import { FormulaInfoButton } from '../FormulaInfoButton';
import { DASHBOARD_FORMULAS } from '../../utils/dashboardFormulas';
import { formatIndianCurrencyCompact } from '../../utils/format';
import {
  getCollectionPerformanceStatus,
  getCostPerformanceStatus,
  type PerformanceStatusTone,
} from '../PerformanceHighlightCard';
import {
  semanticBarFillClass,
  semanticBadgeClass,
  semanticValueClass,
  type DashboardSemanticTone,
} from '../../utils/dashboardSemanticColors';
import { usePmcExecutiveTheme } from '../../utils/pmcExecutiveTheme';
import { plannedValueSectionTitle } from '../../utils/dashboardContractorLabels';
import { monthYearLabel } from '../../utils/healthSafety';
import type { PlannedEarnedByPeriodResponse } from '../../services/api';

const mapPerformanceTone = (tone: PerformanceStatusTone): DashboardSemanticTone => {
  if (tone === 'success') return 'positive';
  if (tone === 'danger' || tone === 'attention') return 'negative';
  if (tone === 'warning' || tone === 'moderate') return 'warning';
  return 'neutral';
};

export interface PMCHeadMoneyKpiSectionProps {
  plannedEarnedByPeriod: PlannedEarnedByPeriodResponse | null;
  isLoadingPlannedEarned: boolean;
  plannedEarnedError: string | null;
  cpiGaugePct: number;
  bcwp: number;
  ac: number;
  costVariance: number;
  contractPerformanceData: unknown;
  performancePercentage: number;
  isLoadingContractPerformance: boolean;
  contractPerformanceError: string | null;
  billedValue: number;
  actualReceiptValue: number;
  receiptVariance: number;
  contractorDisplayName?: string;
}

const PerformanceTile: React.FC<{
  icon: React.ReactNode;
  title: string;
  percent: number;
  statusLabel: string;
  tone: 'positive' | 'negative' | 'warning' | 'neutral';
  metrics: { label: string; value: string }[];
  headerActions?: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
  empty?: boolean;
  showTbdOverlay?: boolean;
}> = ({
  icon,
  title,
  percent,
  statusLabel,
  tone,
  metrics,
  headerActions,
  isLoading,
  error,
  empty,
  showTbdOverlay,
}) => {
  const ex = usePmcExecutiveTheme();
  return (
  <div className={ex.performanceTile}>
    <div className={`flex items-start justify-between gap-2 border-b px-4 py-3 sm:px-5 ${ex.toolbarBorder}`}>
      <div className="flex items-center gap-2.5">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${ex.pulseIconBg} ${ex.isDark ? 'text-blue-400' : 'text-[#1e3a5f]'}`}>
          {icon}
        </span>
        <h4 className={`text-xs font-black uppercase tracking-wide sm:text-sm ${ex.heading}`}>{title}</h4>
      </div>
      {headerActions}
    </div>

    <div className="flex flex-1 flex-col p-4 sm:p-5">
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className={`h-8 w-8 animate-spin rounded-full border-2 border-t-[#1e3a5f] ${ex.isDark ? 'border-white/10' : 'border-slate-200'}`} />
        </div>
      ) : error ? (
        <p className={`text-sm font-semibold ${ex.roseText}`}>{error}</p>
      ) : empty ? (
        <p className={`text-sm ${ex.muted}`}>No data available</p>
      ) : (
        <>
          <div className="text-center">
            <p className={`text-4xl font-black tabular-nums sm:text-5xl ${semanticValueClass(tone, ex.isDark)}`}>
              {percent.toFixed(0)}%
            </p>
            <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${semanticBadgeClass(tone, ex.isDark)}`}>
              {statusLabel}
            </span>
          </div>
          <div className={`mx-auto mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full ${ex.progressTrack}`}>
            <div
              className={`h-full rounded-full ${semanticBarFillClass(tone)}`}
              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
          </div>
          <ul className={`mt-5 space-y-2.5 border-t pt-4 ${ex.toolbarBorder}`}>
            {metrics.map((m) => (
              <li key={m.label} className="flex items-center justify-between gap-3 text-sm">
                <span className={`font-semibold ${ex.muted}`}>{m.label}</span>
                <span className={`font-black tabular-nums ${ex.headingStrong}`}>{m.value}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {showTbdOverlay && !isLoading && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-900/45 backdrop-blur-[1px]">
          <span className="rounded-lg bg-white/10 px-3 py-1.5 text-lg font-black uppercase tracking-[0.2em] text-white">
            TBD
          </span>
        </div>
      )}
    </div>
  </div>
  );
};

const PMCHeadMoneyKpiSection: React.FC<PMCHeadMoneyKpiSectionProps> = ({
  plannedEarnedByPeriod,
  isLoadingPlannedEarned,
  plannedEarnedError,
  cpiGaugePct,
  bcwp,
  ac,
  costVariance,
  contractPerformanceData,
  performancePercentage,
  isLoadingContractPerformance,
  contractPerformanceError,
  billedValue,
  actualReceiptValue,
  receiptVariance,
  contractorDisplayName,
}) => {
  const ex = usePmcExecutiveTheme();
  const cpiStatus = getCostPerformanceStatus(cpiGaugePct);
  const collectionStatus = getCollectionPerformanceStatus(
    contractPerformanceData ? performancePercentage : 0,
  );
  const cpiTone = mapPerformanceTone(cpiStatus.tone);
  const collectionTone = mapPerformanceTone(collectionStatus.tone);

  const periodLabel =
    plannedEarnedByPeriod?.month && plannedEarnedByPeriod?.year
      ? monthYearLabel(plannedEarnedByPeriod.month, plannedEarnedByPeriod.year)
      : null;

  return (
    <section id="exec-section-planned-vs-actual" className={`overflow-hidden ${ex.surface}`}>
      <div className={`border-b px-4 py-3.5 sm:px-5 ${ex.borderSubtle} ${ex.surfaceMuted}`}>
        <h3 className={ex.panelTitle}>Performance indicators</h3>
        <p className={ex.panelSubtitle}>
          Earned value, cost index & collection at a glance
          {periodLabel ? ` · ${periodLabel}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 sm:gap-5 sm:p-5">
        <PlannedEarnedValueGroupCard
          className={`!rounded-xl !shadow-none ${ex.isDark ? '!border-white/10' : '!border-slate-200'}`}
          sclData={plannedEarnedByPeriod?.scl ?? null}
          contractorData={plannedEarnedByPeriod?.contractor ?? null}
          contractorSectionTitle={plannedValueSectionTitle('Contractor', contractorDisplayName)}
          groupSubtitle={
            periodLabel
              ? `SCL & Contractor performance · ${periodLabel}`
              : 'SCL & Contractor performance'
          }
          isLoading={isLoadingPlannedEarned}
          sclError={plannedEarnedError}
          contractorError={plannedEarnedError}
          headerActions={<FormulaInfoButton {...DASHBOARD_FORMULAS.plannedVsEarnedValue} />}
        />

        {/* Cost + Collection — last row */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          <PerformanceTile
            icon={<Activity size={18} />}
            title="Cost performance"
            percent={cpiGaugePct}
            statusLabel={cpiStatus.label}
            tone={cpiTone}
            showTbdOverlay
            metrics={[
              { label: 'BCWP', value: formatIndianCurrencyCompact(bcwp) },
              { label: 'AC', value: formatIndianCurrencyCompact(ac) },
              {
                label: 'Variance',
                value: formatIndianCurrencyCompact(costVariance, { showSign: true }),
              },
            ]}
            headerActions={<FormulaInfoButton {...DASHBOARD_FORMULAS.projectCostPerformance} />}
          />

          <PerformanceTile
            icon={<FileText size={18} />}
            title="Collection"
            percent={contractPerformanceData ? performancePercentage : 0}
            statusLabel={collectionStatus.label}
            tone={collectionTone}
            showTbdOverlay
            isLoading={isLoadingContractPerformance}
            error={contractPerformanceError}
            empty={!isLoadingContractPerformance && !contractPerformanceError && !contractPerformanceData}
            metrics={
              contractPerformanceData
                ? [
                    { label: 'Billed', value: formatIndianCurrencyCompact(billedValue) },
                    { label: 'Receipt', value: formatIndianCurrencyCompact(actualReceiptValue) },
                    {
                      label: 'Variance',
                      value: formatIndianCurrencyCompact(receiptVariance, { showSign: true }),
                    },
                  ]
                : [
                    { label: 'Billed', value: '—' },
                    { label: 'Receipt', value: '—' },
                    { label: 'Variance', value: '—' },
                  ]
            }
            headerActions={<FormulaInfoButton {...DASHBOARD_FORMULAS.contractPerformance} />}
          />
        </div>
      </div>
    </section>
  );
};

export default PMCHeadMoneyKpiSection;
