import React from 'react';
import { getCorrespondenceProgressTextTone, getCorrespondenceProgressTone } from '../utils/correspondence';
import { getThemeClasses, useTheme } from '../utils/theme';

interface CorrespondenceProgressBarProps {
  efficiency: number;
  label?: string;
}

const CorrespondenceProgressBar: React.FC<CorrespondenceProgressBarProps> = ({
  efficiency,
  label = 'Delivery Efficiency',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const clamped = Math.min(100, Math.max(0, efficiency));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`text-[9px] font-black uppercase tracking-widest ${themeClasses.textMuted}`}>{label}</span>
        <span className={`text-sm font-black tabular-nums ${getCorrespondenceProgressTextTone(clamped)}`}>
          {clamped.toFixed(2)}%
        </span>
      </div>
      <div className={`relative h-2.5 w-full overflow-hidden rounded-full ${isDarkTheme ? 'bg-slate-700/60' : 'bg-slate-200'}`}>
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${getCorrespondenceProgressTone(clamped)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

export default React.memo(CorrespondenceProgressBar);
