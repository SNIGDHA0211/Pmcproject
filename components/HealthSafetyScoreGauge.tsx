import React from 'react';
import { getSafetyScoreLabel } from '../utils/healthSafety';
import { getThemeClasses, useTheme } from '../utils/theme';

interface HealthSafetyScoreGaugeProps {
  score: number;
  compact?: boolean;
  showDescription?: boolean;
}

const HealthSafetyScoreGauge: React.FC<HealthSafetyScoreGaugeProps> = ({
  score,
  compact = false,
  showDescription = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const { label, tone, ring } = getSafetyScoreLabel(score);
  const clamped = Math.min(100, Math.max(0, score));
  const size = compact ? 72 : 88;
  const stroke = compact ? 7 : 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={`flex items-center gap-3 ${compact ? '' : 'flex-col sm:flex-row'}`}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isDarkTheme ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={ring}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-black tabular-nums ${tone}`}>{clamped}%</span>
        </div>
      </div>
      <div className={compact ? 'min-w-0 text-left' : 'text-center sm:text-left'}>
        <p className={`text-[9px] font-black uppercase tracking-widest ${themeClasses.textMuted}`}>Safety Score</p>
        <p className={`text-sm font-black uppercase ${tone}`}>{label}</p>
        {showDescription && (
          <p className={`mt-1 max-w-[240px] text-[10px] leading-snug ${themeClasses.textSecondary}`}>
            {label === 'Needs Attention'
              ? 'Focus on reducing high severity incidents and improve safety compliance.'
              : label === 'Critical'
                ? 'Immediate action required to address severe incidents and restore safe operations.'
                : 'Safety performance is within acceptable limits for the selected period.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default React.memo(HealthSafetyScoreGauge);
