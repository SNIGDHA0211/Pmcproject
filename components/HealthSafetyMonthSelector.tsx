import React from 'react';
import { Calendar } from 'lucide-react';
import { MONTH_OPTIONS, buildHealthSafetyYearOptions } from '../utils/healthSafety';
import { getThemeClasses, useTheme } from '../utils/theme';

interface HealthSafetyMonthSelectorProps {
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  compact?: boolean;
  /** High-contrast styling for dashboard card header */
  prominent?: boolean;
}

const HealthSafetyMonthSelector: React.FC<HealthSafetyMonthSelectorProps> = ({
  month,
  year,
  onMonthChange,
  onYearChange,
  compact = false,
  prominent = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const fieldShell = prominent
    ? `relative min-w-0 flex-1 rounded-xl border-2 shadow-sm ${
        isDarkTheme
          ? 'border-blue-400/50 bg-slate-900/60'
          : 'border-blue-300 bg-white ring-1 ring-blue-100'
      }`
    : `relative min-w-0 flex-1 rounded-xl border ${
        isDarkTheme ? 'border-white/15 bg-white/5' : 'border-slate-200 bg-white'
      }`;

  const selectClass = prominent
    ? `w-full appearance-none rounded-xl border-0 bg-transparent py-2.5 pl-9 pr-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/40 ${
        isDarkTheme ? 'text-white' : 'text-slate-900'
      }`
    : compact
      ? `w-full appearance-none rounded-xl border-0 bg-transparent py-2 pl-8 pr-2 text-[12px] font-bold outline-none ${
          isDarkTheme ? 'text-white' : 'text-slate-800'
        }`
      : `w-full appearance-none rounded-xl border-0 bg-transparent px-3 py-2 text-[11px] font-bold outline-none ${themeClasses.input}`;

  const iconClass = prominent
    ? isDarkTheme
      ? 'text-blue-300'
      : 'text-blue-600'
    : themeClasses.textMuted;

  const labelClass = `mb-1 block text-[8px] font-black uppercase tracking-widest ${
    prominent ? (isDarkTheme ? 'text-blue-300/90' : 'text-blue-600') : themeClasses.textMuted
  }`;

  return (
    <div className={`flex gap-3 ${compact || prominent ? 'flex-row' : 'grid grid-cols-1 sm:grid-cols-2'}`}>
      <div className={fieldShell}>
        <label className={`px-2.5 pt-2 ${labelClass}`}>Month</label>
        <div className="relative">
          <Calendar
            size={prominent ? 16 : 14}
            className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${iconClass}`}
          />
          <select
            value={month}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            className={selectClass}
            aria-label="Select month"
          >
            {MONTH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={fieldShell}>
        <label className={`px-2.5 pt-2 ${labelClass}`}>Year</label>
        <div className="relative">
          <Calendar
            size={prominent ? 16 : 14}
            className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${iconClass}`}
          />
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className={selectClass}
            aria-label="Select year"
          >
            {buildHealthSafetyYearOptions(year).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default React.memo(HealthSafetyMonthSelector);
