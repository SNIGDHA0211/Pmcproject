import React from 'react';
import type { HSERecord } from '../services/api';
import {
  formatHseScorecardValue,
  HSE_CLIENT_SCORECARD,
} from '../utils/healthSafetyScorecard';
import { DASHBOARD_STATUS_METRIC_LABEL_CLASS, getThemeClasses, useTheme } from '../utils/theme';

interface HealthSafetyScorecardGridProps {
  record: HSERecord;
  compact?: boolean;
}

const HealthSafetyScorecardGrid: React.FC<HealthSafetyScorecardGridProps> = ({
  record,
  compact = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <div
      className={`rounded-xl border p-3 sm:p-4 ${
        isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/80'
      }`}
    >
      <p
        className={`mb-3 text-[10px] font-black uppercase tracking-widest ${
          isDarkTheme ? 'text-emerald-300' : 'text-emerald-700'
        }`}
      >
        HSE Monthly Scorecard
      </p>
      <div
        className={`grid gap-2 ${
          compact
            ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
            : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
        }`}
      >
        {HSE_CLIENT_SCORECARD.map((item) => {
          const value = item.getValue(record);
          return (
            <div
              key={`${item.srNo}-${item.shortLabel}`}
              className={`rounded-lg border px-2.5 py-2 ${
                isDarkTheme ? 'border-white/10 bg-white/[0.04]' : 'border-slate-100 bg-white shadow-sm'
              }`}
            >
              <p
                className={`text-[8px] font-bold uppercase leading-tight tracking-wide ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}
              >
                {item.shortLabel}
              </p>
              <p
                className={`mt-1 text-lg font-black tabular-nums leading-none ${themeClasses.textPrimary}`}
              >
                {formatHseScorecardValue(value, item.decimals ?? 0)}
              </p>
              {!compact && (
                <p className={`mt-1 text-[8px] leading-tight ${themeClasses.textMuted}`}>
                  {item.label}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(HealthSafetyScorecardGrid);
