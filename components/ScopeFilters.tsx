import React from 'react';
import { Project, MonthlyScopeFilters } from '../types';
import { Icons } from './Icons';

interface ScopeFiltersProps {
  filters: MonthlyScopeFilters;
  onFiltersChange: (filters: MonthlyScopeFilters) => void;
  projects: Project[];
  themeClasses: Record<string, string>;
  isDarkTheme?: boolean;
  onExportExcel?: () => void;
}

const filterLabelClass = (isDarkTheme: boolean, themeClasses: Record<string, string>) =>
  `mb-1 block text-[13px] font-semibold ${isDarkTheme ? themeClasses.textSecondary : 'text-[#64748B]'}`;

const filterInputClass = (isDarkTheme: boolean, themeClasses: Record<string, string>) =>
  `h-11 w-full min-w-0 rounded-xl border px-3 text-sm font-medium outline-none transition-colors focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${
    isDarkTheme
      ? `${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`
      : 'border-[#E2E8F0] bg-white text-[#1E293B]'
  }`;

const ScopeFilters: React.FC<ScopeFiltersProps> = ({
  filters,
  onFiltersChange,
  projects,
  themeClasses,
  isDarkTheme = false,
  onExportExcel,
}) => {
  const handleFilterChange = (key: keyof MonthlyScopeFilters, value: unknown) => {
    const newFilters = { ...filters };
    if (value === '' || value === null || value === undefined) {
      delete newFilters[key];
    } else {
      (newFilters as Record<string, unknown>)[key] = value;
    }
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  const actionBtnClass = `inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 ${
    isDarkTheme
      ? `${themeClasses.border} ${themeClasses.buttonSecondary}`
      : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-slate-50'
  }`;

  return (
    <div
      className={`monthly-scope-filters-toolbar rounded-2xl border px-4 py-3 ${
        isDarkTheme
          ? `${themeClasses.glassCard} ${themeClasses.border}`
          : 'border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
      }`}
    >
      <div className="flex min-h-[72px] flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <div className="monthly-scope-project-filter min-w-0" data-tour="project-filter">
          <label className={filterLabelClass(isDarkTheme, themeClasses)}>Project</label>
          <select
            value={filters.project != null ? String(filters.project) : ''}
            onChange={(e) =>
              handleFilterChange('project', e.target.value ? Number(e.target.value) : undefined)
            }
            className={filterInputClass(isDarkTheme, themeClasses)}
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </div>

        <div className="monthly-scope-month-filter min-w-0" data-tour="month-filter">
          <label className={filterLabelClass(isDarkTheme, themeClasses)}>Month</label>
          <input
            type="month"
            value={filters.month || ''}
            onChange={(e) => handleFilterChange('month', e.target.value)}
            className={filterInputClass(isDarkTheme, themeClasses)}
          />
        </div>

        <div className="monthly-scope-status-filter min-w-0" data-tour="status-filter">
          <label className={filterLabelClass(isDarkTheme, themeClasses)}>Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className={filterInputClass(isDarkTheme, themeClasses)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="monthly-scope-search min-w-0" data-tour="search-scope">
          <label className={filterLabelClass(isDarkTheme, themeClasses)}>Search</label>
          <div className="relative">
            <Icons.Search
              className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${
                isDarkTheme ? themeClasses.textMuted : 'text-[#94A3B8]'
              }`}
              size={16}
            />
            <input
              type="text"
              placeholder="Search scopes..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className={`${filterInputClass(isDarkTheme, themeClasses)} pl-10`}
            />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-end gap-2">
        {hasActiveFilters && (
          <button type="button" onClick={clearFilters} className={actionBtnClass}>
            Clear
          </button>
        )}
        {onExportExcel && (
          <button
            type="button"
            onClick={onExportExcel}
            className={`monthly-scope-export-btn ${actionBtnClass}`}
            data-tour="export-excel-btn"
          >
            <Icons.Download size={16} />
            Export Excel
          </button>
        )}
      </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3 border-[#E2E8F0]/80">
          {filters.project && (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                isDarkTheme
                  ? `${themeClasses.buttonSecondary} ${themeClasses.border} border`
                  : 'border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]'
              }`}
            >
              Project: {projects.find((p) => String(p.id) === String(filters.project))?.title}
              <button
                type="button"
                onClick={() => handleFilterChange('project', undefined)}
                className="ml-2 hover:text-rose-500"
                aria-label="Remove project filter"
              >
                ×
              </button>
            </span>
          )}
          {filters.month && (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                isDarkTheme
                  ? `${themeClasses.buttonSecondary} ${themeClasses.border} border`
                  : 'border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]'
              }`}
            >
              Month:{' '}
              {new Date(`${filters.month}-01`).toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'long',
              })}
              <button
                type="button"
                onClick={() => handleFilterChange('month', undefined)}
                className="ml-2 hover:text-rose-500"
                aria-label="Remove month filter"
              >
                ×
              </button>
            </span>
          )}
          {filters.status && (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                isDarkTheme
                  ? `${themeClasses.buttonSecondary} ${themeClasses.border} border`
                  : 'border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]'
              }`}
            >
              Status: {filters.status.replace('_', ' ')}
              <button
                type="button"
                onClick={() => handleFilterChange('status', undefined)}
                className="ml-2 hover:text-rose-500"
                aria-label="Remove status filter"
              >
                ×
              </button>
            </span>
          )}
          {filters.search && (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                isDarkTheme
                  ? `${themeClasses.buttonSecondary} ${themeClasses.border} border`
                  : 'border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]'
              }`}
            >
              Search: {filters.search}
              <button
                type="button"
                onClick={() => handleFilterChange('search', undefined)}
                className="ml-2 hover:text-rose-500"
                aria-label="Remove search filter"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ScopeFilters;
