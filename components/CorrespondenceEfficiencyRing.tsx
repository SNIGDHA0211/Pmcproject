import React from 'react';
import {
  correspondenceEfficiencyBadgeClasses,
  getCorrespondenceEfficiencyStatus,
  getCorrespondenceProgressTone,
} from '../utils/correspondence';
import { getThemeClasses, useTheme } from '../utils/theme';

interface CorrespondenceEfficiencyRingProps {
  efficiency: number;
  size?: 'default' | 'compact';
}

const CorrespondenceEfficiencyRing: React.FC<CorrespondenceEfficiencyRingProps> = ({
  efficiency,
  size = 'default',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const status = getCorrespondenceEfficiencyStatus(efficiency);
  const clamped = Math.min(100, Math.max(0, efficiency));
  const isCompact = size === 'compact';
  const radius = isCompact ? 36 : 48;
  const viewSize = isCompact ? 96 : 120;
  const strokeWidth = isCompact ? 8 : 9;
  const center = viewSize / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const strokeHex =
    clamped >= 90 ? '#22c55e' : clamped >= 70 ? '#f97316' : '#ef4444';

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="relative" style={{ width: viewSize, height: viewSize }}>
        <svg viewBox={`0 0 ${viewSize} ${viewSize}`} className="h-full w-full -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={isDarkTheme ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={strokeHex}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className={`font-black tabular-nums leading-none ${themeClasses.textPrimary} ${isCompact ? 'text-lg' : 'text-xl'}`}>
            {clamped.toFixed(2)}%
          </p>
        </div>
      </div>
      <p className={`mt-1 text-[8px] font-black uppercase tracking-widest ${themeClasses.textMuted}`}>
        Delivery Efficiency
      </p>
      <span
        className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wide ${correspondenceEfficiencyBadgeClasses[status.level]}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${getCorrespondenceProgressTone(clamped)}`} aria-hidden />
        {status.label}
      </span>
    </div>
  );
};

export default React.memo(CorrespondenceEfficiencyRing);
