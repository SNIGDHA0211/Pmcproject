import React from 'react';
import { AlertCircle, AlertTriangle, MinusCircle, ShieldCheck, Skull } from 'lucide-react';
import type { IncidentKpiKey } from '../utils/healthSafety';
import { INCIDENT_KPI_CONFIG } from '../utils/healthSafety';
import { getThemeClasses, useTheme, DASHBOARD_STATUS_METRIC_LABEL_CLASS } from '../utils/theme';

const ICONS: Record<IncidentKpiKey, React.FC<{ size?: number; className?: string }>> = {
  fatalities: Skull,
  significant: AlertTriangle,
  major: AlertCircle,
  minor: MinusCircle,
  nearMiss: ShieldCheck,
};

interface HealthSafetyIncidentKpiCardProps {
  metricKey: IncidentKpiKey;
  value: number;
  variant?: 'compact' | 'expanded';
}

const HealthSafetyIncidentKpiCard: React.FC<HealthSafetyIncidentKpiCardProps> = ({
  metricKey,
  value,
  variant = 'compact',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const config = INCIDENT_KPI_CONFIG.find((c) => c.key === metricKey)!;
  const Icon = ICONS[metricKey];

  if (variant === 'expanded') {
    return (
      <div
        className={`flex flex-col overflow-hidden rounded-xl border shadow-sm ${
          isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex flex-1 flex-col items-center px-3 pb-2 pt-4 text-center">
          <div
            className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full ${
              isDarkTheme ? 'bg-white/10' : 'bg-slate-50'
            }`}
          >
            <Icon size={20} className={config.textColor} />
          </div>
          <p className={`text-[9px] font-black uppercase tracking-widest ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>
            {config.label}
          </p>
          <p className={`mt-1 text-3xl font-black tabular-nums leading-none ${config.textColor}`}>
            {value.toLocaleString('en-IN')}
          </p>
        </div>
        <div className={`py-1.5 text-center text-[8px] font-black uppercase tracking-widest ${config.badgeClass}`}>
          {config.badgeLabel}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex min-w-0 flex-col overflow-hidden rounded-lg border ${
        isDarkTheme ? 'border-white/10 bg-white' : 'border-slate-200 bg-white shadow-sm'
      }`}
    >
      <div className="flex flex-1 flex-col items-center px-1.5 pb-2 pt-2.5 text-center sm:px-2">
        <div
          className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-full ${
            isDarkTheme ? 'bg-slate-800/10' : 'bg-slate-50'
          }`}
        >
          <Icon size={16} className={config.textColor} />
        </div>
        <p className={`text-[7px] font-black uppercase leading-tight tracking-wide sm:text-[8px] ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>
          {config.label}
        </p>
        <p className={`mt-0.5 text-xl font-black tabular-nums leading-none sm:text-2xl ${config.textColor}`}>
          {value.toLocaleString('en-IN')}
        </p>
      </div>
      <div className={`h-1 w-full ${config.barColor}`} />
    </div>
  );
};

export default React.memo(HealthSafetyIncidentKpiCard);
