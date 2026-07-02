import React from 'react';
import {
  correspondenceTrackingBadgeClasses,
  getCorrespondenceProgressTextTone,
  getCorrespondenceProgressTone,
  getCorrespondenceTrackingStatus,
} from '../utils/correspondence';
import { DASHBOARD_STATUS_METRIC_LABEL_CLASS, getThemeClasses, useTheme } from '../utils/theme';

interface CorrespondenceSemiGaugeProps {
  efficiency: number;
  compact?: boolean;
  split?: boolean;
}

/** Delivery efficiency summary (horizontal bar layout, matches certification / growth cards). */
const CorrespondenceSemiGauge: React.FC<CorrespondenceSemiGaugeProps> = ({
  efficiency,
  compact = false,
  split = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const clamped = Math.min(100, Math.max(0, efficiency));
  const tracking = getCorrespondenceTrackingStatus(clamped);
  const barFill = Math.min(100, Math.max(0, clamped));
  const pctTone = getCorrespondenceProgressTextTone(clamped);
  const barClass = getCorrespondenceProgressTone(clamped);
  const dense = compact || split;

  return (
    <div
      className={`flex h-full min-h-[9.5rem] flex-col rounded-lg border px-3 py-2.5 sm:min-h-[10rem] sm:px-3.5 sm:py-3 ${
        isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-sm font-semibold uppercase tracking-wide sm:text-base ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>
            Delivery Efficiency
          </p>
          {!dense && (
            <p className={`mt-0.5 line-clamp-2 text-sm ${themeClasses.textMuted}`}>
              On time vs total delivered (excluding pending)
            </p>
          )}
        </div>
        <p
          className={`shrink-0 font-black tabular-nums leading-none text-lg sm:text-xl ${pctTone}`}
        >
          {clamped.toFixed(dense ? 1 : 2)}%
        </p>
      </div>

      <div className={`${dense ? 'mt-2 h-2' : 'mt-3 h-2.5'} overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'}`}>
        <div className={`h-full rounded-full transition-all duration-500 ${barClass}`} style={{ width: `${barFill}%` }} />
      </div>

      <div className={`${dense ? 'mt-2' : 'mt-3'} mt-auto flex flex-wrap items-center justify-between gap-1.5`}>
        <span
          className={`inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold sm:text-sm ${correspondenceTrackingBadgeClasses[tracking.level]}`}
        >
          <span className="h-1 w-1 shrink-0 rounded-full bg-current opacity-80" aria-hidden />
          <span className="truncate">{tracking.label}</span>
        </span>
        {!dense && <span className={`shrink-0 text-sm ${themeClasses.textMuted}`}>Target: ≥ 80%</span>}
      </div>
    </div>
  );
};

export default React.memo(CorrespondenceSemiGauge);
