import React from 'react';
import {
  getQualityPerformanceStatus,
  getQualityPerformanceTextTone,
  qualityStatusBadgeClasses,
} from '../utils/qualityStatus';
import { DASHBOARD_STATUS_METRIC_LABEL_CLASS, getThemeClasses, useTheme } from '../utils/theme';

interface QualityPerformanceGaugeProps {
  performance: number;
  size?: 'default' | 'compact';
}

const QualityPerformanceGauge: React.FC<QualityPerformanceGaugeProps> = ({
  performance,
  size = 'default',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const status = getQualityPerformanceStatus(performance);
  const clamped = Math.min(100, Math.max(0, performance));
  const performanceTone = getQualityPerformanceTextTone(clamped);
  const isCompact = size === 'compact';
  const radius = isCompact ? 36 : 54;
  const viewSize = isCompact ? 96 : 140;
  const strokeWidth = isCompact ? 8 : 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const center = viewSize / 2;
  const strokeColor =
    status.level === 'excellent'
      ? '#22c55e'
      : status.level === 'good'
        ? '#3b82f6'
        : status.level === 'attention'
          ? '#f59e0b'
          : '#ef4444';

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border ${
        isCompact ? 'px-3 py-3' : 'px-4 py-5'
      } ${themeClasses.border} ${isDarkTheme ? 'bg-white/5' : 'bg-white shadow-sm'}`}
    >
      <div className="relative" style={{ width: viewSize, height: viewSize }}>
        <svg viewBox={`0 0 ${viewSize} ${viewSize}`} className="h-full w-full -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p
            className={`font-black tabular-nums leading-none ${performanceTone} ${
              isCompact ? 'text-lg' : 'text-[26px]'
            }`}
          >
            {clamped.toFixed(1)}%
          </p>
          {!isCompact && (
            <p className={`mt-1 text-[8px] font-black uppercase tracking-widest ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>
              Quality Performance
            </p>
          )}
        </div>
      </div>
      {isCompact ? (
        <div className="mt-1 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          <span className="text-[9px] font-black uppercase tracking-wide text-emerald-600">{status.label}</span>
        </div>
      ) : (
        <span
          className={`mt-3 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${qualityStatusBadgeClasses[status.level]}`}
        >
          <span aria-hidden>{status.emoji}</span>
          {status.label}
        </span>
      )}
    </div>
  );
};

export default React.memo(QualityPerformanceGauge);
