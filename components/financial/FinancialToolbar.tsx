import React from 'react';
import { Icons } from '../Icons';
import { DollarSign, RefreshCw, Sparkles } from 'lucide-react';
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
  const cardBase = isDarkTheme
    ? 'pmc-ov-card rounded-2xl pmc360-glass-panel-dark'
    : 'pmc-ov-card rounded-2xl pmc360-glass-panel-light';

  const selectClass = isDarkTheme
    ? `h-10 min-w-0 rounded-xl border px-3 text-xs font-bold outline-none transition-all shadow-sm ${themeClasses.input}`
    : 'h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 shadow-sm';

  return (
    <div
      className={`financial-top-controls p-4 sm:p-5 ${cardBase}`}
      style={{ '--ov-accent': '#10b981', '--ov-delay': '0ms' } as React.CSSProperties}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Title block */}
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #1e3a5f 130%)' }}
          >
            <DollarSign size={22} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className={`text-base font-black uppercase tracking-wider sm:text-lg ${themeClasses.textPrimary}`}>
                Financial Management
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live Commercial Data
              </span>
            </div>
            <p className={`text-[11px] font-medium ${themeClasses.textMuted}`}>
              Project commercial tracking, cashflow forecasting, EVM &amp; invoicing
            </p>
          </div>
        </div>

        {/* Controls block */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Project dropdown */}
          <div className="financial-project-select fin-project-dropdown min-w-[180px] sm:min-w-[220px]">
            <select
              value={selectedProject}
              onChange={(e) => onProjectChange(e.target.value)}
              className={`${selectClass} w-full`}
              aria-label="Project"
            >
              <option value="">Select Project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Month / Year */}
          <div className="financial-period-controls flex items-center gap-1.5">
            <select
              value={month}
              onChange={(e) => onMonthChange(Number(e.target.value))}
              className={`fin-month-dropdown ${selectClass} w-[100px]`}
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
              className={`fin-year-field ${selectClass} w-[84px]`}
              aria-label="Year"
            >
              {buildHealthSafetyYearOptions(year).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Role badge */}
          {roleForSubmission && (
            <div className="hidden shrink-0 lg:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {roleForSubmission}
            </div>
          )}

          {/* Refresh button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading || isRefreshing}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold uppercase tracking-wider shadow-sm transition-all ${themeClasses.buttonSecondary}`}
            title="Refresh data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-emerald-500' : ''} />
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          {/* Tour button */}
          <button
            type="button"
            onClick={onStartTour}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all"
            title="Start interactive guided tour"
          >
            <Sparkles size={14} />
            <span>Tour</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinancialToolbar;
