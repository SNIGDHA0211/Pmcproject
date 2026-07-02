import React from 'react';
import {
  correspondenceEfficiencyBadgeClasses,
  getCorrespondenceEfficiencyStatus,
} from '../utils/correspondence';
import { DASHBOARD_STATUS_METRIC_LABEL_CLASS, getThemeClasses, useTheme } from '../utils/theme';

interface CorrespondenceEfficiencyPanelProps {
  efficiency: number;
}

const CorrespondenceEfficiencyPanel: React.FC<CorrespondenceEfficiencyPanelProps> = ({ efficiency }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const status = getCorrespondenceEfficiencyStatus(efficiency);
  const clamped = Math.min(100, Math.max(0, efficiency));

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border px-4 py-4 ${themeClasses.border} ${
        isDarkTheme ? 'bg-white/5' : 'bg-slate-50'
      }`}
    >
      <p className={`text-[28px] font-black tabular-nums leading-none ${themeClasses.textPrimary}`}>
        {clamped.toFixed(2)}%
      </p>
      <p className={`mt-1 text-[9px] font-bold uppercase tracking-widest ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>
        Delivery Efficiency
      </p>
      <span
        className={`mt-2 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${correspondenceEfficiencyBadgeClasses[status.level]}`}
      >
        <span aria-hidden>{status.emoji}</span>
        {status.label}
      </span>
    </div>
  );
};

export default React.memo(CorrespondenceEfficiencyPanel);
