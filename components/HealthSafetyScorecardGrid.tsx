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
        {HSE_CLIENT_SCORECARD.map((item, index) => {
          const value = item.getValue(record);
          const accentColor = index % 3 === 0 ? '#10b981' : index % 3 === 1 ? '#3b82f6' : '#f59e0b';
          return (
            <div
              key={`${item.srNo}-${item.shortLabel}`}
              className={`pmc-ov-tile rounded-xl border p-2.5 transition-all ${
                isDarkTheme ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200/80 bg-white shadow-sm'
              }`}
              style={{
                borderLeftWidth: 3,
                borderLeftColor: accentColor,
              }}
            >
              <p
                className={`text-[8.5px] font-black uppercase leading-tight tracking-wider ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}
              >
                {item.shortLabel}
              </p>
              <p
                className={`mt-1 text-lg font-black tabular-nums leading-none ${themeClasses.textPrimary}`}
              >
                {formatHseScorecardValue(value, item.decimals ?? 0)}
              </p>
              {!compact && (
                <p className={`mt-1 line-clamp-1 text-[8.5px] font-medium leading-tight ${themeClasses.textMuted}`}>
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
