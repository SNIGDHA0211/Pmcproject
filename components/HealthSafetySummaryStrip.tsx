import React from 'react';
import { Clock, Users } from 'lucide-react';
import type { HSERecord } from '../services/api';
import { calculateSafetyScore } from '../utils/healthSafety';
import { resolveManHoursWorked } from '../utils/healthSafetyScorecard';
import { statusDashboardValueClass } from '../utils/dashboardSemanticColors';
import HealthSafetyScoreGauge from './HealthSafetyScoreGauge';
import { DASHBOARD_STATUS_METRIC_LABEL_CLASS, getThemeClasses, useTheme } from '../utils/theme';

interface HealthSafetySummaryStripProps {
  record: HSERecord;
  variant?: 'compact' | 'expanded';
}

const HealthSafetySummaryStrip: React.FC<HealthSafetySummaryStripProps> = ({
  record,
  variant = 'compact',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const score = calculateSafetyScore(record);

  if (variant === 'expanded') {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div
          className={`flex items-center gap-4 rounded-xl border p-4 ${
            isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white shadow-sm'
          }`}
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isDarkTheme ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
            <Users size={22} className={statusDashboardValueClass('neutral', isDarkTheme)} />
          </div>
          <div>
            <p className={`text-[9px] font-black uppercase tracking-widest ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>Man Hours Worked</p>
            <p className={`text-3xl font-black tabular-nums ${statusDashboardValueClass('neutral', isDarkTheme)}`}>
              {resolveManHoursWorked(record).toLocaleString('en-IN')}
            </p>
            <p className={`text-[10px] font-semibold ${statusDashboardValueClass('neutral', isDarkTheme)} opacity-80`}>Manhours</p>
          </div>
        </div>
        <div
          className={`flex items-center gap-4 rounded-xl border p-4 ${
            isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white shadow-sm'
          }`}
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isDarkTheme ? 'bg-rose-500/15' : 'bg-rose-50'}`}>
            <Clock size={22} className={statusDashboardValueClass('negative', isDarkTheme)} />
          </div>
          <div>
            <p className={`text-[9px] font-black uppercase tracking-widest ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>Loss of Manhours</p>
            <p className={`text-3xl font-black tabular-nums ${statusDashboardValueClass('negative', isDarkTheme)}`}>
              {record.lossOfManhours.toLocaleString('en-IN')}
            </p>
            <p className={`text-[10px] font-semibold ${statusDashboardValueClass('negative', isDarkTheme)} opacity-80`}>Manhours</p>
          </div>
        </div>
        <div
          className={`flex items-center justify-center rounded-xl border p-4 ${
            isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white shadow-sm'
          }`}
        >
          <HealthSafetyScoreGauge score={score} showDescription />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border ${
        isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white shadow-sm'
      }`}
    >
      <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0 divide-slate-200 dark:divide-white/10">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isDarkTheme ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
            <Users size={18} className={statusDashboardValueClass('neutral', isDarkTheme)} />
          </div>
          <div className="min-w-0">
            <p className={`text-[8px] font-black uppercase tracking-widest ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>Man Hrs Worked</p>
            <p className={`text-2xl font-black tabular-nums ${statusDashboardValueClass('neutral', isDarkTheme)}`}>
              {resolveManHoursWorked(record).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isDarkTheme ? 'bg-rose-500/15' : 'bg-rose-50'}`}>
            <Clock size={18} className={statusDashboardValueClass('negative', isDarkTheme)} />
          </div>
          <div className="min-w-0">
            <p className={`text-[8px] font-black uppercase tracking-widest ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>Loss of Manhours</p>
            <p className={`text-2xl font-black tabular-nums ${statusDashboardValueClass('negative', isDarkTheme)}`}>
              {record.lossOfManhours.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center px-4 py-3">
          <HealthSafetyScoreGauge score={score} compact />
        </div>
      </div>
    </div>
  );
};

export default React.memo(HealthSafetySummaryStrip);
