import React from 'react';
import { getThemeClasses, useTheme, DASHBOARD_STATUS_METRIC_LABEL_CLASS } from '../utils/theme';

interface HealthSafetyKpiCardProps {
  label: string;
  value: number;
  accent?: string;
}

const HealthSafetyKpiCard: React.FC<HealthSafetyKpiCardProps> = ({ label, value, accent }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <div className={`rounded-xl border px-2.5 py-2 ${themeClasses.border} ${isDarkTheme ? 'bg-white/5' : 'bg-slate-50'}`}>
      <p className={`text-[8px] font-black uppercase tracking-[0.16em] ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>{label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums leading-none ${accent ?? themeClasses.textPrimary}`}>
        {value.toLocaleString('en-IN')}
      </p>
    </div>
  );
};

export default React.memo(HealthSafetyKpiCard);
