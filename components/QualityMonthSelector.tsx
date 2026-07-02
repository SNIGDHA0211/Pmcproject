import React from 'react';
import { Calendar } from 'lucide-react';
import { MONTH_OPTIONS, buildQualityYearOptions } from '../utils/qualityStatus';
import { getThemeClasses, useTheme } from '../utils/theme';

interface QualityMonthSelectorProps {
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  yearOptions?: number[];
  compact?: boolean;
}

const QualityMonthSelector: React.FC<QualityMonthSelectorProps> = ({
  month,
  year,
  onMonthChange,
  onYearChange,
  yearOptions = buildQualityYearOptions(),
  compact = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const selectClass = compact
    ? `min-w-0 flex-1 appearance-none rounded-lg border py-1.5 pl-7 pr-2 text-[11px] font-semibold outline-none ${themeClasses.input} ${themeClasses.border}`
    : `w-full rounded-xl px-3 py-2 text-[11px] font-bold outline-none ${themeClasses.input}`;

  if (compact) {
    return (
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Calendar
            size={14}
            className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 ${themeClasses.textMuted}`}
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
        <div className="relative min-w-0 flex-1">
          <Calendar
            size={14}
            className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 ${themeClasses.textMuted}`}
          />
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className={selectClass}
            aria-label="Select year"
          >
            {yearOptions.map((optionYear) => (
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
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div>
        <label className={`mb-1 block text-[8px] font-black uppercase tracking-widest ${themeClasses.textMuted}`}>
          Month
        </label>
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
      <div>
        <label className={`mb-1 block text-[8px] font-black uppercase tracking-widest ${themeClasses.textMuted}`}>
          Year
        </label>
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className={selectClass}
          aria-label="Select year"
        >
          {yearOptions.map((optionYear) => (
            <option key={optionYear} value={optionYear}>
              {optionYear}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default React.memo(QualityMonthSelector);
