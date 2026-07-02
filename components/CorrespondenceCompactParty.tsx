import React from 'react';
import { AlertCircle, ArrowUp, Download } from 'lucide-react';
import type { CorrespondencePartyMetrics } from '../types';
import {
  correspondenceTrackingBadgeClasses,
  getCorrespondenceProgressTone,
  getCorrespondenceTrackingStatus,
} from '../utils/correspondence';
import CorrespondenceKpiCard from './CorrespondenceKpiCard';
import {
  DASHBOARD_CORRESPONDENCE_PARTY_TITLE_CLASS,
  DASHBOARD_STATUS_METRIC_LABEL_CLASS,
  getThemeClasses,
  useTheme,
} from '../utils/theme';

interface CorrespondenceCompactPartyProps {
  partyLabel: string;
  metrics: CorrespondencePartyMetrics;
  monthYearText: string;
}

const CorrespondenceCompactParty: React.FC<CorrespondenceCompactPartyProps> = ({
  partyLabel,
  metrics,
  monthYearText,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const efficiency = Math.min(100, Math.max(0, metrics.deliveryEfficiency));
  const tracking = getCorrespondenceTrackingStatus(efficiency);

  return (
    <div
      className={`rounded-xl border p-3 ${
        isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white shadow-sm'
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className={DASHBOARD_CORRESPONDENCE_PARTY_TITLE_CLASS}>{partyLabel}</p>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold ${themeClasses.textPrimary}`}>{monthYearText}</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${correspondenceTrackingBadgeClasses[tracking.level]}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
            {tracking.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <CorrespondenceKpiCard
          variant="compact"
          label="Received"
          value={metrics.correspondenceReceived}
          accent="text-blue-600"
          icon={<Download size={14} className="text-blue-600" />}
        />
        <CorrespondenceKpiCard
          variant="compact"
          label="Delivered"
          value={metrics.correspondenceDelivered}
          accent="text-emerald-600"
          icon={<ArrowUp size={14} className="text-emerald-600" />}
        />
        <CorrespondenceKpiCard
          variant="compact"
          label="Pending"
          value={metrics.pendingCorrespondence}
          accent="text-orange-500"
          icon={<AlertCircle size={14} className="text-orange-500" />}
        />
      </div>

      <div
        className={`mt-3 rounded-lg border px-3 py-3 ${
          isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50/80'
        }`}
      >
        <p className={`text-center text-3xl font-black tabular-nums leading-none ${themeClasses.textPrimary}`}>
          {efficiency.toFixed(2)}%
        </p>
        <p className={`mt-1 text-center text-[8px] font-bold uppercase tracking-widest ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>
          Delivery Efficiency
        </p>
        <div className="mt-2 flex justify-center">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${correspondenceTrackingBadgeClasses[tracking.level]}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
            {tracking.label}
          </span>
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <div
            className={`relative h-2 flex-1 overflow-hidden rounded-full ${isDarkTheme ? 'bg-slate-700/60' : 'bg-slate-200'}`}
          >
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${getCorrespondenceProgressTone(efficiency)}`}
              style={{ width: `${efficiency}%` }}
            />
          </div>
          <span className={`shrink-0 text-[9px] font-bold tabular-nums ${themeClasses.textMuted}`}>
            {efficiency.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CorrespondenceCompactParty);
