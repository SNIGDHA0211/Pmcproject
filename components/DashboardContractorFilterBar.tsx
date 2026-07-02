import React from 'react';
import { Check, ChevronDown, HardHat, Plus, Users } from 'lucide-react';
import type { ProjectDatesRecord } from '../services/api';
import { contractorLabel } from '../utils/projectDatesMulti';
import { contractorDisplayName } from '../utils/dashboardContractorLabels';
import { getThemeClasses, useTheme } from '../utils/theme';

interface DashboardContractorFilterBarProps {
  contractors: ProjectDatesRecord[];
  selectedContractorId: number | null;
  onSelectContractor: (id: number) => void;
  isLoading?: boolean;
  onAddContractor?: () => void;
  className?: string;
}

const DashboardContractorFilterBar: React.FC<DashboardContractorFilterBarProps> = ({
  contractors,
  selectedContractorId,
  onSelectContractor,
  isLoading = false,
  onAddContractor,
  className = '',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const selected =
    contractors.find((c) => c.id === selectedContractorId) ?? contractors[0] ?? null;
  const selectedName = contractorDisplayName(contractorLabel(selected));
  const selectedIndex = selected
    ? contractors.findIndex((c) => c.id === selected.id) + 1
    : 0;
  const total = contractors.length;

  if (isLoading) {
    return (
      <section
        className={`dashboard-contractor-filter animate-pulse overflow-hidden rounded-2xl border px-4 py-4 ${className} ${
          isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl ${themeClasses.bgSecondary}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-4 w-48 rounded ${themeClasses.bgSecondary}`} />
            <div className={`h-3 w-64 rounded ${themeClasses.bgSecondary}`} />
          </div>
        </div>
      </section>
    );
  }

  if (!total) {
    return (
      <section
        className={`dashboard-contractor-filter overflow-hidden rounded-2xl border ${className} ${
          isDarkTheme
            ? 'border-amber-500/25 bg-amber-500/5'
            : 'border-amber-200 bg-amber-50/80'
        }`}
        aria-label="No contractors"
      >
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isDarkTheme ? 'bg-amber-500/15 text-amber-300' : 'bg-white text-amber-700 shadow-sm'
              }`}
            >
              <Users size={20} strokeWidth={2.25} aria-hidden />
            </span>
            <div>
              <p className={`text-sm font-black ${themeClasses.textPrimary}`}>
                No contractors on this project yet
              </p>
              <p className={`mt-1 text-xs leading-relaxed sm:text-[13px] ${themeClasses.textSecondary}`}>
                Add a contractor under <strong>Project Dates</strong> to see their schedule, billing,
                and reports here. SCL (owner) data is always shown separately.
              </p>
            </div>
          </div>
          {onAddContractor && (
            <button
              type="button"
              onClick={onAddContractor}
              className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors ${
                isDarkTheme ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Plus size={14} strokeWidth={2.5} />
              Add first contractor
            </button>
          )}
        </div>
      </section>
    );
  }

  const countLabel = total === 1 ? '1 contractor' : `${total} contractors`;

  return (
    <section
      className={`dashboard-contractor-filter overflow-hidden rounded-2xl border shadow-sm ${className} ${
        isDarkTheme
          ? 'border-blue-500/25 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent'
          : 'border-blue-200/80 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white'
      }`}
      aria-label="Contractor selection"
    >
      {/* Header: count + instructions */}
      <div
        className={`flex flex-col gap-3 border-b px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
          isDarkTheme ? 'border-white/10' : 'border-blue-100/80'
        }`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isDarkTheme
                ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30'
                : 'bg-white text-blue-700 ring-1 ring-blue-100 shadow-sm'
            }`}
          >
            <HardHat size={22} strokeWidth={2.25} aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`text-sm font-black uppercase tracking-wide ${themeClasses.textPrimary}`}>
                Select contractor
              </p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide ${
                  isDarkTheme
                    ? 'bg-blue-500/20 text-blue-200 ring-1 ring-blue-500/30'
                    : 'bg-blue-600 text-white shadow-sm'
                }`}
              >
                <Users size={11} aria-hidden />
                {countLabel}
              </span>
            </div>
            <p className={`mt-1 text-xs leading-snug sm:text-[13px] ${themeClasses.textSecondary}`}>
              {total > 1
                ? 'Tap a name below or use the list. All contractor sections on this page will update.'
                : 'This project has one contractor. Their details are shown in each section below.'}
            </p>
          </div>
        </div>

        {/* Dropdown — numbered options for clarity */}
        <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:min-w-[260px] md:min-w-[300px]">
          <label
            htmlFor="dashboard-contractor-select"
            className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
          >
            Contractor list
          </label>
          <div className="relative">
            <select
              id="dashboard-contractor-select"
              value={selected?.id ?? ''}
              onChange={(e) => onSelectContractor(Number(e.target.value))}
              className={`w-full appearance-none rounded-xl border py-2.5 pl-3 pr-9 text-sm font-bold outline-none transition-colors focus:ring-2 focus:ring-blue-500/35 ${
                isDarkTheme
                  ? `${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`
                  : 'border-blue-200 bg-white text-slate-900 shadow-sm'
              }`}
            >
              {contractors.map((c, index) => (
                <option key={c.id} value={c.id}>
                  {index + 1}. {contractorLabel(c)}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${
                isDarkTheme ? 'text-slate-400' : 'text-slate-500'
              }`}
              aria-hidden
            />
          </div>
        </div>
      </div>

      {/* Clickable contractor chips */}
      <div className="px-4 py-3 sm:px-5">
        <p
          className={`mb-2 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
        >
          All contractors on this project
        </p>
        <div className="flex flex-wrap gap-2">
          {contractors.map((c, index) => {
            const name = contractorLabel(c);
            const isActive = c.id === selected?.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  if (c.id != null) onSelectContractor(c.id);
                }}
                aria-pressed={isActive}
                className={`inline-flex max-w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-bold transition-all ${
                  isActive
                    ? isDarkTheme
                      ? 'border-blue-400/50 bg-blue-500/20 text-blue-100 shadow-sm ring-2 ring-blue-400/30'
                      : 'border-blue-500 bg-blue-600 text-white shadow-md'
                    : isDarkTheme
                      ? 'border-white/10 bg-white/[0.04] text-slate-200 hover:border-blue-500/30 hover:bg-blue-500/10'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
                    isActive
                      ? isDarkTheme
                        ? 'bg-blue-400/30 text-white'
                        : 'bg-white/20 text-white'
                      : isDarkTheme
                        ? 'bg-white/10 text-slate-400'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="truncate">{name}</span>
                {isActive && <Check size={14} className="shrink-0" strokeWidth={3} aria-hidden />}
              </button>
            );
          })}
          {onAddContractor && (
            <button
              type="button"
              onClick={onAddContractor}
              className={`inline-flex items-center gap-1.5 rounded-xl border border-dashed px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                isDarkTheme
                  ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'
                  : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Plus size={13} />
              Add contractor
            </button>
          )}
        </div>
      </div>

      {/* Active selection summary */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 sm:px-5 ${
          isDarkTheme
            ? 'border-white/10 bg-white/[0.03]'
            : 'border-blue-100/80 bg-blue-50/50'
        }`}
      >
        <p className={`text-xs sm:text-sm ${themeClasses.textSecondary}`}>
          <span className="font-semibold">Now viewing:</span>{' '}
          <span className={`font-black ${themeClasses.textPrimary}`}>{selectedName}</span>
        </p>
        {total > 1 && (
          <p
            className={`rounded-lg px-2 py-0.5 text-[11px] font-bold tabular-nums ${
              isDarkTheme ? 'bg-white/10 text-slate-300' : 'bg-white text-slate-600 shadow-sm'
            }`}
          >
            Contractor {selectedIndex} of {total}
          </p>
        )}
      </div>
    </section>
  );
};

export default DashboardContractorFilterBar;
