import React from 'react';
import type { HealthSafetyYtdSummary } from '../services/api';
import { INCIDENT_KPI_CONFIG, toIncidentMetrics } from '../utils/healthSafety';
import { DASHBOARD_STATUS_METRIC_LABEL_CLASS, getThemeClasses, useTheme } from '../utils/theme';

interface HealthSafetyYtdSummaryProps {
  year: number;
  summary: HealthSafetyYtdSummary | null;
  variant?: 'default' | 'expanded';
}

const HealthSafetyYtdSummarySection: React.FC<HealthSafetyYtdSummaryProps> = ({
  year,
  summary,
  variant = 'default',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const metrics = toIncidentMetrics(summary);

  const labels: Record<string, string> = {
    fatalities: 'Total Fatalities',
    significant: 'Total Significant',
    major: 'Total Major',
    minor: 'Total Minor',
    nearMiss: 'Total Near Miss',
  };

  return (
    <div
      className={`rounded-xl border p-4 ${
        variant === 'expanded'
          ? isDarkTheme
            ? 'border-white/10 bg-white/5'
            : 'border-slate-200 bg-white shadow-sm'
          : `${themeClasses.border} ${isDarkTheme ? 'bg-white/5' : 'bg-slate-50'}`
      }`}
    >
      <h4 className={`mb-3 text-sm font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
        Year-To-Date Summary ({year})
      </h4>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {INCIDENT_KPI_CONFIG.map((config) => (
          <div
            key={config.key}
            className={`rounded-lg border px-3 py-2.5 text-center ${
              isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50'
            }`}
          >
            <p className={`text-[8px] font-black uppercase tracking-wider ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>
              {labels[config.key]}
            </p>
            <p className={`mt-1 text-xl font-black tabular-nums ${config.textColor}`}>
              {metrics[config.key].toLocaleString('en-IN')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(HealthSafetyYtdSummarySection);
