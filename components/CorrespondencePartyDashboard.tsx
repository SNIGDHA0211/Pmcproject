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

  const breakdown = useMemo(
    () =>
      buildCorrespondenceStatusBreakdown(metrics, documents, correspondenceType, {
        month: selectedMonth,
        year: selectedYear,
      }),
    [metrics, documents, correspondenceType, selectedMonth, selectedYear]
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

  return (
    <section
      className={`min-w-0 space-y-2.5 rounded-xl border p-3 sm:space-y-3 sm:p-3.5 ${
        isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/40'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            correspondenceType === 'CLIENT' ? 'bg-blue-500' : 'bg-violet-500'
          }`}
        />
        <h4 className={`text-sm font-semibold uppercase tracking-wide sm:text-base ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'}`}>
          {label}
        </h4>
      </div>

      <CorrespondenceMetricStrip breakdown={breakdown} compact={compact || split} split={split} />

      <div
        className={`grid min-h-0 auto-rows-fr gap-2.5 ${
          dense
            ? "grid-cols-1 min-[480px]:grid-cols-2"
            : "grid-cols-1 md:grid-cols-2"
        }`}
      >
        <CorrespondenceSemiGauge efficiency={efficiency} compact={dense} split={split} />
        <CorrespondenceStatusDonut breakdown={breakdown} compact={dense} split={split} />
      </div>
    </section>
  );
};

export default React.memo(CorrespondencePartyDashboard);
