import React from 'react';
import type { DrawingProjectSummary as DrawingProjectSummaryType } from '../types';
import { getApprovalRateTextTone } from '../utils/drawingSummary';
import { getThemeClasses, useTheme } from '../utils/theme';

interface DrawingProjectSummaryProps {
  summary: DrawingProjectSummaryType | null;
}

const DrawingProjectSummary: React.FC<DrawingProjectSummaryProps> = ({ summary }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  if (!summary) {
    return (
      <div className={`rounded-xl border border-dashed p-4 text-center ${themeClasses.border}`}>
        <p className={`text-[10px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>
          No project totals available
        </p>
      </div>
    );
  }

  const rows = [
    ['Total Submitted Drawings', summary.submittedDrawings.toLocaleString('en-IN'), themeClasses.textPrimary],
    ['Total Approved Drawings', summary.approvedDrawings.toLocaleString('en-IN'), 'text-emerald-500'],
    ['Total Variance', summary.variance.toLocaleString('en-IN'), 'text-orange-500'],
    [
      'Overall Approval Rate',
      `${summary.approvalRate.toFixed(1)}%`,
      getApprovalRateTextTone(summary.approvalRate),
    ],
  ] as const;

  return (
    <div
      className={`rounded-xl border p-4 ${
        isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white shadow-sm'
      }`}
    >
      <h4 className={`mb-3 text-sm font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
        Project Totals
      </h4>
      <dl className="space-y-2">
        {rows.map(([label, value, accent]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-[11px]">
            <dt className={`font-bold uppercase tracking-wide ${themeClasses.textMuted}`}>{label}</dt>
            <dd className={`font-black tabular-nums ${accent}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default React.memo(DrawingProjectSummary);
