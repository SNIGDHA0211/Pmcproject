import React from 'react';
import { getApprovalRateTextTone, getApprovalRateTone } from '../utils/drawingSummary';
import { getThemeClasses, useTheme } from '../utils/theme';

interface DrawingApprovalProgressProps {
  approvalRate: number;
}

const DrawingApprovalProgress: React.FC<DrawingApprovalProgressProps> = ({ approvalRate }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const clamped = Math.min(100, Math.max(0, approvalRate));

  return (
    <div
      className={`rounded-xl border px-4 py-4 ${
        isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white shadow-sm'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
          Approval Rate
        </span>
        <span className={`text-lg font-black tabular-nums ${getApprovalRateTextTone(clamped)}`}>
          {clamped.toFixed(1)}%
        </span>
      </div>
      <div className={`relative h-2.5 w-full overflow-hidden rounded-full ${isDarkTheme ? 'bg-slate-700/60' : 'bg-slate-200'}`}>
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${getApprovalRateTone(clamped)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

export default React.memo(DrawingApprovalProgress);
