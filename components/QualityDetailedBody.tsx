import React from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, XCircle } from 'lucide-react';
import type { ProjectQualityStatusRecord } from '../types';
import QualityKpiCard from './QualityKpiCard';
import QualityPerformanceGauge from './QualityPerformanceGauge';
import QualityTrendChart from './QualityTrendChart';
import QualitySummaryPanel from './QualitySummaryPanel';
import { getCompletionRate, getShortfallAccent } from '../utils/qualityStatus';
import { STATUS_DASHBOARD_VALUE } from '../utils/dashboardSemanticColors';
import { DASHBOARD_STATUS_METRIC_LABEL_CLASS, getThemeClasses, useTheme } from '../utils/theme';

interface QualityDetailedBodyProps {
  record: ProjectQualityStatusRecord;
  yearRecords: ProjectQualityStatusRecord[];
  selectedYear: number;
}

const QualityDetailedBody: React.FC<QualityDetailedBodyProps> = ({
  record,
  yearRecords,
  selectedYear,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const completionRate = getCompletionRate(record.testsConducted, record.testsRequired);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QualityKpiCard
          variant="icon"
          label="Tests Required"
          value={record.testsRequired}
          accent={STATUS_DASHBOARD_VALUE.neutral}
          icon={<ClipboardList size={20} className={STATUS_DASHBOARD_VALUE.neutral} />}
        />
        <QualityKpiCard
          variant="icon"
          label="Tests Conducted"
          value={record.testsConducted}
          accent={STATUS_DASHBOARD_VALUE.positive}
          icon={<CheckCircle2 size={20} className={STATUS_DASHBOARD_VALUE.positive} />}
        />
        <QualityKpiCard
          variant="icon"
          label="Shortfall"
          value={record.shortfall}
          accent={getShortfallAccent(record.shortfall)}
          icon={<AlertTriangle size={20} className={STATUS_DASHBOARD_VALUE.warning} />}
        />
        <QualityPerformanceGauge performance={record.qualityPerformance} size="compact" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <QualityKpiCard
          variant="icon"
          label="Tests Passed"
          value={record.testsPassed}
          accent={STATUS_DASHBOARD_VALUE.positive}
          icon={<CheckCircle2 size={20} className={STATUS_DASHBOARD_VALUE.positive} />}
        />
        <QualityKpiCard
          variant="icon"
          label="Tests Failed"
          value={record.testsFailed}
          accent={STATUS_DASHBOARD_VALUE.negative}
          icon={<XCircle size={20} className={STATUS_DASHBOARD_VALUE.negative} />}
        />
        <div
          className={`flex flex-col justify-center rounded-xl border px-4 py-3 lg:col-span-1 ${
            isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white shadow-sm'
          }`}
        >
          <p className={`text-[9px] font-black uppercase tracking-widest ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>
            Test Completion
          </p>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
            <span className={`font-bold tabular-nums ${themeClasses.textPrimary}`}>
              {record.testsConducted.toLocaleString('en-IN')} / {record.testsRequired.toLocaleString('en-IN')}
            </span>
            <span className="font-black tabular-nums text-blue-600">{completionRate.toFixed(1)}%</span>
          </div>
          <div
            className={`relative mt-2 h-2.5 w-full overflow-hidden rounded-full ${isDarkTheme ? 'bg-slate-700/60' : 'bg-slate-200'}`}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, completionRate)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <QualityTrendChart records={yearRecords} year={selectedYear} />
        <QualitySummaryPanel record={record} />
      </div>
    </div>
  );
};

export default React.memo(QualityDetailedBody);
