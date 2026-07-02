import React from 'react';
import { Calendar } from 'lucide-react';
import type { Project } from '../../types';
import { MONTH_OPTIONS, buildSiteImageYearOptions } from '../../utils/siteImages';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface SitePhotoFiltersProps {
  projects: Project[];
  projectName: string;
  month: number;
  year: number;
  onProjectChange: (name: string) => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

const SitePhotoFilters: React.FC<SitePhotoFiltersProps> = ({
  projects,
  projectName,
  month,
  year,
  onProjectChange,
  onMonthChange,
  onYearChange,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const selectClass = `w-full rounded-xl border px-3 py-2.5 text-sm font-bold outline-none ${themeClasses.input} ${themeClasses.border}`;

  return (
    <div className="site-photo-filters grid grid-cols-1 gap-3 md:grid-cols-3">
      <div>
        <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
          Project
        </label>
        <select value={projectName} onChange={(e) => onProjectChange(e.target.value)} className={selectClass}>
          <option value="">Select project...</option>
          {projects.map((p) => (
            <option key={p.id} value={p.title}>
              {p.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
          Month
        </label>
        <div className="relative">
          <Calendar
            size={14}
            className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${themeClasses.textMuted}`}
          />
          <select
            value={month}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            className={`${selectClass} pl-9`}
            aria-label="Select month"
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
          Year
        </label>
        <select value={year} onChange={(e) => onYearChange(Number(e.target.value))} className={selectClass} aria-label="Select year">
          {buildSiteImageYearOptions().map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default SitePhotoFilters;
