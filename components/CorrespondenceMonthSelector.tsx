import React from 'react';
import { Calendar } from 'lucide-react';
import { MONTH_OPTIONS, buildCorrespondenceYearOptions } from '../utils/correspondence';
import { getThemeClasses, useTheme } from '../utils/theme';

interface CorrespondenceMonthSelectorProps {
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  compact?: boolean;
  className?: string;
}

const CorrespondenceMonthSelector: React.FC<CorrespondenceMonthSelectorProps> = ({
  month,
  year,
  onMonthChange,
  onYearChange,
  compact = false,
  className = '',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const selectClass = compact
    ? `w-full min-w-0 appearance-none rounded-lg border py-2 pl-8 pr-2 text-sm font-semibold outline-none ${themeClasses.input} ${themeClasses.border}`
    : `w-full rounded-xl px-3 py-2 text-[11px] font-bold outline-none ${themeClasses.input}`;

  if (compact) {
    return (
      <div className={`grid grid-cols-2 gap-2 ${className}`}>
        <div className="relative min-w-0">
          <Calendar
            size={14}
            className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${themeClasses.textMuted}`}
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
        <div className="relative min-w-0">
          <Calendar
            size={14}
            className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${themeClasses.textMuted}`}
          />
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className={selectClass}
            aria-label="Select year"
          >
            {buildCorrespondenceYearOptions().map((optionYear) => (
              <option key={optionYear} value={optionYear}>
                {optionYear}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${className}`}>
      <div>
        <label className={`mb-1 block text-[8px] font-black uppercase tracking-widest ${themeClasses.textMuted}`}>
          Month
        </label>
        <select value={month} onChange={(e) => onMonthChange(Number(e.target.value))} className={selectClass}>
          {MONTH_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={`mb-1 block text-[8px] font-black uppercase tracking-widest ${themeClasses.textMuted}`}>
          Year
        </label>
        <select value={year} onChange={(e) => onYearChange(Number(e.target.value))} className={selectClass}>
          {buildCorrespondenceYearOptions().map((optionYear) => (
            <option key={optionYear} value={optionYear}>
              {optionYear}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default React.memo(CorrespondenceMonthSelector);
