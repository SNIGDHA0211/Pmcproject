import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import type { HSERecord } from '../services/api';
import HealthSafetyPyramid from './HealthSafetyPyramid';
import { INCIDENT_KPI_CONFIG, toIncidentMetrics } from '../utils/healthSafety';
import { statusDashboardValueClass } from '../utils/dashboardSemanticColors';
import { DASHBOARD_STATUS_METRIC_LABEL_CLASS, getThemeClasses, useTheme } from '../utils/theme';

interface HealthSafetyCompactSummaryProps {
  record: HSERecord;
  pairLayout?: boolean;
}

const PAIR_INCIDENT_SPAN: Record<string, string> = {
  fatalities: 'col-span-2',
  significant: 'col-span-2',
  major: 'col-span-2',
  minor: 'col-span-3',
  nearMiss: 'col-span-3',
};

const PAIR_INCIDENT_ACCENT: Record<string, string> = {
  fatalities: '#000000',
  significant: '#dc2626',
  major: '#f97316',
  minor: '#facc15',
  nearMiss: '#22c55e',
};

const HealthSafetyCompactSummary: React.FC<HealthSafetyCompactSummaryProps> = ({
  record,
  pairLayout = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const metrics = toIncidentMetrics(record);

  const manhoursCardBase = `relative flex flex-col justify-between overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md ${
    pairLayout ? 'h-[4.25rem] px-3 py-2' : 'h-[58px] px-3 py-2'
  } ${isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200/90 bg-white'}`;

  if (pairLayout) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
        <div
          className={`grid flex-1 grid-cols-6 gap-2 rounded-xl border p-2.5 ${
            isDarkTheme
              ? 'border-white/10 bg-gradient-to-br from-slate-900/50 via-slate-800/30 to-blue-950/20'
              : 'border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-blue-50/50'
          }`}
        >
          {INCIDENT_KPI_CONFIG.map((config) => (
            <div
              key={config.key}
              className={`${PAIR_INCIDENT_SPAN[config.key]} flex flex-col justify-between rounded-lg border px-2.5 py-2 ${
                isDarkTheme ? 'border-white/10 bg-white/[0.04]' : 'border-slate-100 bg-white shadow-sm'
              }`}
              style={{ borderTop: `3px solid ${PAIR_INCIDENT_ACCENT[config.key]}` }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/80 dark:ring-slate-900/80"
                  style={{ backgroundColor: PAIR_INCIDENT_ACCENT[config.key] }}
                />
                <p className={`text-[9px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}>
                  {config.shortLabel}
                </p>
              </div>
              <p className={`mt-1 text-xl font-black tabular-nums leading-none ${config.textColor}`}>
                {metrics[config.key].toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2.5">
          <div className={manhoursCardBase}>
            <div
              className={`absolute inset-y-0 left-0 w-1 ${
                isDarkTheme ? 'bg-blue-400' : 'bg-gradient-to-b from-blue-400 to-blue-600'
              }`}
              aria-hidden
            />
            <div className="flex items-center justify-between gap-2 pl-2">
              <div className="min-w-0">
                <p className={`text-[9px] font-black uppercase tracking-widest ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>
                  Total Manhours
                </p>
                <p className={`mt-0.5 text-2xl font-black tabular-nums leading-none ${statusDashboardValueClass('neutral', isDarkTheme)}`}>
                  {record.totalManhours.toLocaleString('en-IN')}
                </p>
              </div>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  isDarkTheme ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-600'
                }`}
              >
                <Clock size={16} strokeWidth={2.5} />
              </span>
            </div>
          </div>

          <div className={manhoursCardBase}>
            <div
              className={`absolute inset-y-0 left-0 w-1 ${
                isDarkTheme ? 'bg-rose-400' : 'bg-gradient-to-b from-rose-400 to-rose-600'
              }`}
              aria-hidden
            />
            <div className="flex items-center justify-between gap-2 pl-2">
              <div className="min-w-0">
                <p className={`text-[9px] font-black uppercase tracking-widest ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>
                  Loss Manhours
                </p>
                <p className={`mt-0.5 text-2xl font-black tabular-nums leading-none ${statusDashboardValueClass('negative', isDarkTheme)}`}>
                  {record.lossOfManhours.toLocaleString('en-IN')}
                </p>
              </div>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  isDarkTheme ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-50 text-rose-600'
                }`}
              >
                <AlertTriangle size={16} strokeWidth={2.5} />
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 pb-3">
        <HealthSafetyPyramid stats={metrics} variant="summary" />
      </div>

      <div className="mt-auto grid shrink-0 grid-cols-2 gap-3">
        <div className={manhoursCardBase}>
          <div
            className={`absolute inset-y-0 left-0 w-1 ${
              isDarkTheme ? 'bg-blue-400' : 'bg-gradient-to-b from-blue-400 to-blue-600'
            }`}
            aria-hidden
          />
          <div className="flex items-start justify-between gap-2 pl-2">
            <div className="min-w-0">
              <p className={`text-[8px] font-black uppercase tracking-widest ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>
                Total Manhours
              </p>
              <p className={`mt-0.5 text-2xl font-black tabular-nums leading-none ${statusDashboardValueClass('neutral', isDarkTheme)}`}>
                {record.totalManhours.toLocaleString('en-IN')}
              </p>
            </div>
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                isDarkTheme ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-600'
              }`}
            >
              <Clock size={15} strokeWidth={2.5} />
            </span>
          </div>
        </div>

        <div className={manhoursCardBase}>
          <div
            className={`absolute inset-y-0 left-0 w-1 ${
              isDarkTheme ? 'bg-rose-400' : 'bg-gradient-to-b from-rose-400 to-rose-600'
            }`}
            aria-hidden
          />
          <div className="flex items-start justify-between gap-2 pl-2">
            <div className="min-w-0">
              <p className={`text-[8px] font-black uppercase tracking-widest ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>
                Loss Manhours
              </p>
              <p className={`mt-0.5 text-2xl font-black tabular-nums leading-none ${statusDashboardValueClass('negative', isDarkTheme)}`}>
                {record.lossOfManhours.toLocaleString('en-IN')}
              </p>
            </div>
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                isDarkTheme ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-50 text-rose-600'
              }`}
            >
              <AlertTriangle size={15} strokeWidth={2.5} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(HealthSafetyCompactSummary);
