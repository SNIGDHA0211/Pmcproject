import React from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Percent } from 'lucide-react';
import type { ProjectQualityStatusRecord } from '../types';
import {
  getQualityPerformanceStatus,
  getQualityPerformanceBarTone,
  getQualityPerformanceTextTone,
  getShortfallAccent,
  qualityPerformanceSummaryBadge,
} from '../utils/qualityStatus';
import QualityKpiCard from './QualityKpiCard';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';
import { DASHBOARD_STATUS_METRIC_LABEL_CLASS, getThemeClasses, useTheme } from '../utils/theme';
import { STATUS_DASHBOARD_VALUE } from '../utils/dashboardSemanticColors';

interface QualityCompactSummaryProps {
  record: ProjectQualityStatusRecord;
}

const QualityCompactSummary: React.FC<QualityCompactSummaryProps> = ({ record }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const performance = Math.min(100, Math.max(0, record.qualityPerformance));
  const status = getQualityPerformanceStatus(performance);
  const performanceTone = getQualityPerformanceTextTone(performance);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QualityKpiCard
          variant="compact"
          label="Tests Required"
          value={record.testsRequired}
          accent={STATUS_DASHBOARD_VALUE.neutral}
          icon={<ClipboardList size={14} className={STATUS_DASHBOARD_VALUE.neutral} />}
        />
        <QualityKpiCard
          variant="compact"
          label="Tests Conducted"
          value={record.testsConducted}
          accent={STATUS_DASHBOARD_VALUE.positive}
          icon={<CheckCircle2 size={14} className={STATUS_DASHBOARD_VALUE.positive} />}
        />
        <QualityKpiCard
          variant="compact"
          label="Shortfall"
          value={record.shortfall}
          accent={getShortfallAccent(record.shortfall)}
          icon={<AlertTriangle size={14} className={STATUS_DASHBOARD_VALUE.warning} />}
        />
        <QualityKpiCard
          variant="compact"
          label="Quality Performance"
          value={`${performance.toFixed(1)}%`}
          accent={performanceTone}
          icon={<Percent size={14} className={performanceTone} />}
        />
      </div>

      <div
        className={`rounded-xl border px-4 py-4 ${
          isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'
        }`}
      >
        <p className={`text-center text-[2.25rem] font-black tabular-nums leading-none sm:text-5xl ${performanceTone}`}>
          {performance.toFixed(1)}%
        </p>
        <p className={`mt-1 text-center ${typo.labelBold} ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>
          Quality Performance
        </p>
        <div className="mt-2 flex justify-center">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${qualityPerformanceSummaryBadge[status.level]}`}
          >
            <span className="h-2 w-2 rounded-full bg-current opacity-80" aria-hidden />
            {status.label === 'NEEDS ATTENTION' ? 'ATTENTION' : status.label}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div
            className={`relative h-2.5 flex-1 overflow-hidden rounded-full ${isDarkTheme ? 'bg-slate-700/60' : 'bg-slate-200'}`}
          >
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${getQualityPerformanceBarTone(performance)}`}
              style={{ width: `${performance}%` }}
            />
          </div>
          <span className={`shrink-0 text-[10px] font-bold tabular-nums ${themeClasses.textMuted}`}>
            {performance.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(QualityCompactSummary);
