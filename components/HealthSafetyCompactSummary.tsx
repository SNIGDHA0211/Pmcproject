import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import type { HSERecord } from '../services/api';
import HealthSafetyPyramid from './HealthSafetyPyramid';
import { toIncidentMetrics } from '../utils/healthSafety';
import { statusDashboardValueClass } from '../utils/dashboardSemanticColors';
import { DASHBOARD_STATUS_METRIC_LABEL_CLASS, getThemeClasses, useTheme } from '../utils/theme';

interface HealthSafetyCompactSummaryProps {
  record: HSERecord;
}

const HealthSafetyCompactSummary: React.FC<HealthSafetyCompactSummaryProps> = ({ record }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const metrics = toIncidentMetrics(record);

  const manhoursCardBase = `relative flex h-[58px] flex-col justify-between overflow-hidden rounded-xl border px-3 py-2 shadow-sm transition-shadow hover:shadow-md ${
    isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200/90 bg-white'
  }`;

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
