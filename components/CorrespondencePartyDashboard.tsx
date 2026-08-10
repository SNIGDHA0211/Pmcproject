import React, { useMemo } from 'react';
import type { CorrespondenceDocument, CorrespondencePartyMetrics, CorrespondenceType } from '../types';
import {
  buildCorrespondenceStatusBreakdown,
  computeDeliveryEfficiencyFromBreakdown,
  correspondenceTypeLabel,
} from '../utils/correspondence';
import CorrespondenceMetricStrip from './CorrespondenceMetricStrip';
import CorrespondenceSemiGauge from './CorrespondenceSemiGauge';
import CorrespondenceStatusDonut from './CorrespondenceStatusDonut';
import { useTheme } from '../utils/theme';

interface CorrespondencePartyDashboardProps {
  partyLabel?: string;
  correspondenceType: CorrespondenceType;
  metrics: CorrespondencePartyMetrics;
  documents: CorrespondenceDocument[];
  selectedMonth: number;
  selectedYear: number;
  compact?: boolean;
  split?: boolean;
}

const CorrespondencePartyDashboard: React.FC<CorrespondencePartyDashboardProps> = ({
  partyLabel,
  correspondenceType,
  metrics,
  documents,
  selectedMonth,
  selectedYear,
  compact = false,
  split = false,
}) => {
  const { isDarkTheme } = useTheme();
  const label = partyLabel ?? correspondenceTypeLabel(correspondenceType);
  const isClient = correspondenceType === 'CLIENT';

  const breakdown = useMemo(
    () =>
      buildCorrespondenceStatusBreakdown(metrics, documents, correspondenceType, {
        month: selectedMonth,
        year: selectedYear,
      }),
    [metrics, documents, correspondenceType, selectedMonth, selectedYear],
  );

  const efficiency = useMemo(() => {
    const fromBreakdown = computeDeliveryEfficiencyFromBreakdown(breakdown);
    if (breakdown.delivered > 0) {
      return fromBreakdown;
    }
    if (metrics.deliveryEfficiency > 0) {
      return Math.min(100, Math.max(0, metrics.deliveryEfficiency));
    }
    return fromBreakdown;
  }, [breakdown, metrics.deliveryEfficiency]);

  const dense = compact || split;

  const shellClass = isClient
    ? isDarkTheme
      ? 'border-blue-400/45 bg-blue-500/[0.06] shadow-[inset_0_3px_0_0_rgba(59,130,246,0.85)]'
      : 'border-blue-300 bg-blue-50/50 shadow-[inset_0_3px_0_0_#3b82f6]'
    : isDarkTheme
      ? 'border-violet-400/45 bg-violet-500/[0.06] shadow-[inset_0_3px_0_0_rgba(139,92,246,0.85)]'
      : 'border-violet-300 bg-violet-50/45 shadow-[inset_0_3px_0_0_#8b5cf6]';

  const titleClass = isClient
    ? isDarkTheme
      ? 'text-blue-300'
      : 'text-blue-700'
    : isDarkTheme
      ? 'text-violet-300'
      : 'text-violet-700';

  const badgeClass = isClient
    ? isDarkTheme
      ? 'bg-blue-500/20 text-blue-200'
      : 'bg-blue-100 text-blue-800'
    : isDarkTheme
      ? 'bg-violet-500/20 text-violet-200'
      : 'bg-violet-100 text-violet-800';

  return (
    <section
      className={`flex h-full min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border-2 p-3 sm:gap-3.5 sm:p-4 ${shellClass}`}
      aria-label={`${label} correspondence`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              isClient ? 'bg-blue-500' : 'bg-violet-500'
            }`}
            aria-hidden
          />
          <h4
            className={`truncate text-sm font-black uppercase tracking-[0.08em] sm:text-[15px] ${titleClass}`}
          >
            {label}
          </h4>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${badgeClass}`}
        >
          {isClient ? 'Client side' : 'Contractor side'}
        </span>
      </header>

      <CorrespondenceMetricStrip breakdown={breakdown} compact={compact || split} split={split} />

      <div
        className={`mt-auto grid min-h-0 gap-2.5 ${
          dense ? 'grid-cols-1 min-[520px]:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'
        }`}
      >
        <CorrespondenceSemiGauge efficiency={efficiency} compact={dense} split={split} />
        <CorrespondenceStatusDonut breakdown={breakdown} compact={dense} split={split} />
      </div>
    </section>
  );
};

export default React.memo(CorrespondencePartyDashboard);
