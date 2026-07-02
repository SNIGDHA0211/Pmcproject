import React from 'react';
import type { ProjectQualityStatusRecord } from '../types';
import { getCompletionRate } from '../utils/qualityStatus';
import { getThemeClasses, useTheme } from '../utils/theme';

interface QualitySummaryPanelProps {
  record: ProjectQualityStatusRecord;
}

const QualitySummaryPanel: React.FC<QualitySummaryPanelProps> = ({ record }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const completionRate = getCompletionRate(record.testsConducted, record.testsRequired);

  const rows = [
    ['Tests Required', record.testsRequired.toLocaleString('en-IN')],
    ['Tests Conducted', record.testsConducted.toLocaleString('en-IN')],
    ['Shortfall', record.shortfall.toLocaleString('en-IN')],
    ['Passed', record.testsPassed.toLocaleString('en-IN')],
    ['Failed', record.testsFailed.toLocaleString('en-IN')],
    ['Quality Performance', `${record.qualityPerformance.toFixed(1)}%`],
    ['Completion Rate', `${completionRate.toFixed(1)}%`],
  ] as const;

  return (
    <div className={`rounded-xl border p-3 ${themeClasses.border} ${isDarkTheme ? 'bg-white/5' : 'bg-slate-50'}`}>
      <h4 className={`mb-3 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
        Quality Summary
      </h4>
      <dl className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-[11px]">
            <dt className={`font-bold uppercase tracking-wide ${themeClasses.textMuted}`}>{label}</dt>
            <dd className={`font-black tabular-nums ${themeClasses.textPrimary}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default React.memo(QualitySummaryPanel);
