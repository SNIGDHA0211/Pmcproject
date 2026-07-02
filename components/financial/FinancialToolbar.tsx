import React from 'react';
import { Icons } from '../Icons';
import { MONTH_OPTIONS, buildHealthSafetyYearOptions } from '../../utils/healthSafety';

interface FinancialToolbarProps {
  projects: { id: string; title: string }[];
  selectedProject: string;
  onProjectChange: (id: string) => void;
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  roleForSubmission: string;
  createdBy: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  isLoading: boolean;
  onStartTour: () => void;
  isDarkTheme: boolean;
  themeClasses: Record<string, string>;
}

const FinancialToolbar: React.FC<FinancialToolbarProps> = ({
  projects,
  selectedProject,
  onProjectChange,
  month,
  year,
  onMonthChange,
  onYearChange,
  roleForSubmission,
  createdBy,
  onRefresh,
  isRefreshing,
  isLoading,
  onStartTour,
  isDarkTheme,
  themeClasses,
}) => {
  const selectClass = isDarkTheme
    ? `h-11 min-w-0 rounded-lg border px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#4F46E5]/30 ${themeClasses.input} ${themeClasses.border}`
    : 'h-11 min-w-0 rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm font-medium text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20';

  const pillClass = isDarkTheme
    ? `flex h-11 max-w-[140px] items-center truncate rounded-lg border px-3 text-sm font-medium ${themeClasses.input} ${themeClasses.border}`
    : 'flex h-11 max-w-[140px] items-center truncate rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm font-medium text-[#475569]';

  return (
    <div
      className={`financial-top-controls flex flex-wrap items-center gap-2 rounded-2xl border p-3 sm:min-h-[72px] sm:gap-3 sm:px-4 ${
        isDarkTheme
          ? `${themeClasses.glassCard} ${themeClasses.border}`
          : 'border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
      }`}
    >
      <div className="financial-project-select fin-project-dropdown w-full min-w-0 sm:w-[min(200px,32vw)] sm:max-w-[220px] sm:shrink-0">
        <select
          value={selectedProject}
          onChange={(e) => onProjectChange(e.target.value)}
          className={`${selectClass} w-full`}
          aria-label="Project"
        >
          <option value="">Project…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      <div className="financial-period-controls flex w-full min-w-0 items-center gap-2 sm:w-auto sm:shrink-0">
        <select
          value={month}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          className={`fin-month-dropdown ${selectClass} min-w-0 flex-1 sm:w-[108px] sm:flex-none`}
          aria-label="Month"
        >
          {MONTH_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className={`fin-year-field ${selectClass} min-w-0 w-[88px] shrink-0`}
          aria-label="Year"
        >
          {buildHealthSafetyYearOptions(year).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="financial-role-display fin-logged-user hidden shrink-0 lg:block" title={roleForSubmission}>
        <div className={`${pillClass} text-[#059669]`}>{roleForSubmission || '—'}</div>
      </div>

      <div className="financial-submitted-by fin-submitted-user hidden shrink-0 xl:block" title={createdBy}>
        <div className={pillClass}>{createdBy}</div>
      </div>

      <div className="ml-auto flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing || isLoading}
          className={`financial-refresh-btn fin-refresh-btn flex h-11 items-center gap-2 rounded-lg px-4 text-xs font-semibold uppercase tracking-wide transition-colors disabled:opacity-60 ${
            isDarkTheme ? themeClasses.buttonPrimary : 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
          }`}
        >
          <Icons.History size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{isRefreshing ? 'Loading…' : 'Refresh'}</span>
        </button>
        <button
          type="button"
          onClick={onStartTour}
          className={`restart-tour-btn fm-start-tour-btn hidden h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors lg:flex ${
            isDarkTheme
              ? `${themeClasses.border} text-indigo-300 hover:bg-white/10`
              : 'border-[#E2E8F0] bg-white text-[#4F46E5] hover:bg-[#EEF2FF]'
          }`}
          title="Start guided tour"
        >
          <Icons.Help size={14} />
          Tour
        </button>
      </div>
    </div>
  );
};

export default FinancialToolbar;
