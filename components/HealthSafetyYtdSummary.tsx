import React from 'react';
import type { HealthSafetyYtdSummary } from '../services/api';
import { INCIDENT_KPI_CONFIG, toIncidentMetrics } from '../utils/healthSafety';
import { DASHBOARD_STATUS_METRIC_LABEL_CLASS, getThemeClasses, useTheme } from '../utils/theme';

interface HealthSafetyYtdSummaryProps {
  year: number;
  summary: HealthSafetyYtdSummary | null;
  variant?: 'default' | 'expanded';
}

const ExtraMetric: React.FC<{
  label: string;
  value: number;
  isDarkTheme: boolean;
  themeClasses: ReturnType<typeof getThemeClasses>;
}> = ({ label, value, isDarkTheme, themeClasses }) => (
  <div
    className={`rounded-lg border px-3 py-2.5 text-center ${
      isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50'
    }`}
  >
    <p className={`text-[8px] font-black uppercase tracking-wider ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>
      {label}
    </p>
    <p className={`mt-1 text-lg font-black tabular-nums ${themeClasses.textPrimary}`}>
      {value.toLocaleString('en-IN')}
    </p>
  </div>
);

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

  const extras = [
    { label: 'LTI', value: summary?.reportableAccidentLti ?? 0 },
    { label: 'Dangerous Occ.', value: summary?.dangerousOccurrences ?? 0 },
    { label: 'First Aid', value: summary?.firstAidCases ?? 0 },
    { label: 'Medical Tx', value: summary?.medicalTreatmentCases ?? 0 },
    { label: 'Utility Damage', value: summary?.utilityDamage ?? 0 },
    { label: 'Man Hrs Worked', value: summary?.manHoursWorked ?? summary?.totalManhours ?? 0 },
    { label: 'Loss Manhrs', value: summary?.lossOfManhours ?? 0 },
    { label: 'Internal Training', value: summary?.internalTrainingCount ?? 0 },
    { label: 'External Training', value: summary?.externalTrainingCount ?? 0 },
    { label: 'Mock Drills', value: summary?.mockDrills ?? 0 },
    { label: 'Medical Checkups', value: summary?.medicalCheckupTotal ?? 0 },
  ];

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

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {extras.map((item) => (
          <ExtraMetric
            key={item.label}
            label={item.label}
            value={item.value}
            isDarkTheme={isDarkTheme}
            themeClasses={themeClasses}
          />
        ))}
      </div>
    </div>
  );
};

export default React.memo(HealthSafetyYtdSummarySection);
