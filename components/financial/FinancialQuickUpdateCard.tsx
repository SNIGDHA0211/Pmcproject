import React from 'react';
import { Icons } from '../Icons';

export const financialFieldLabel = (isDarkTheme: boolean, themeClasses: Record<string, string>) =>
  `mb-1 block text-[13px] font-semibold ${isDarkTheme ? themeClasses.textSecondary : 'text-[#64748B]'}`;

export const financialFieldInput = (isDarkTheme: boolean, themeClasses: Record<string, string>) =>
  `h-12 w-full rounded-lg border px-3 text-base font-medium outline-none focus:ring-2 focus:ring-[#4F46E5]/25 ${
    isDarkTheme
      ? `${themeClasses.input} ${themeClasses.border}`
      : 'border-[#E2E8F0] bg-white text-[#0F172A] focus:border-[#4F46E5]'
  }`;

/** Standard 2-column responsive grid — 20px row gap */
export const FinancialFormGrid: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`grid grid-cols-1 gap-5 md:grid-cols-2 ${className}`}>{children}</div>
);

interface FinancialQuickUpdateCardProps {
  title: string;
  projectName: string;
  periodLabel: string;
  successBanner?: string | null;
  children: React.ReactNode;
  className?: string;
  sectionRef?: React.Ref<HTMLDivElement>;
  onSave?: () => void;
  onReset: () => void;
  onRefresh: () => void;
  saveLabel?: string;
  saving?: boolean;
  saveDisabled?: boolean;
  showSave?: boolean;
  refreshDisabled?: boolean;
  isDarkTheme: boolean;
  themeClasses: Record<string, string>;
  footerNote?: string;
}

const FinancialQuickUpdateCard: React.FC<FinancialQuickUpdateCardProps> = ({
  title,
  projectName,
  periodLabel,
  successBanner,
  children,
  className = '',
  sectionRef,
  onSave,
  onReset,
  onRefresh,
  saveLabel = 'Save / Update',
  saving = false,
  saveDisabled = false,
  showSave = true,
  refreshDisabled = false,
  isDarkTheme,
  themeClasses,
  footerNote,
}) => {
  const cardBase = isDarkTheme
    ? 'pmc-ov-card rounded-2xl pmc360-glass-panel-dark'
    : 'pmc-ov-card rounded-2xl pmc360-glass-panel-light';

  const primaryBtn = `h-11 rounded-xl px-6 text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 ${
    isDarkTheme
      ? 'bg-blue-600 hover:bg-blue-500 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white'
  }`;
  const secondaryBtn = `h-11 rounded-xl border px-4 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
    isDarkTheme
      ? `${themeClasses.buttonSecondary} ${themeClasses.border}`
      : 'border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50'
  }`;

  return (
    <div
      ref={sectionRef}
      id="financial-entry-form"
      className={`financial-form-section financial-quick-update scroll-mt-4 p-5 sm:p-6 ${cardBase} ${className}`}
      style={{ '--ov-accent': '#6366f1', '--ov-delay': '80ms' } as React.CSSProperties}
    >
      {successBanner && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold ${
            isDarkTheme
              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
          role="status"
          aria-live="polite"
        >
          <Icons.Approve size={18} className="text-emerald-500 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      <div>
        <header>
          <div className="flex items-center gap-2">
            <h3 className={`text-base font-black uppercase tracking-wider ${themeClasses.textPrimary}`}>
              {title}
            </h3>
            <span className="pmc-ov-live" aria-hidden />
          </div>
          <p className={`mt-1 text-xs font-semibold ${themeClasses.textSecondary}`}>
            <strong className={themeClasses.textPrimary}>{projectName || 'Select a project'}</strong> · Reporting period: <span className="font-bold text-blue-600 dark:text-blue-400">{periodLabel}</span>
          </p>
          {footerNote && (
            <p className={`mt-1 text-[11px] font-medium ${themeClasses.textMuted}`}>{footerNote}</p>
          )}
        </header>

        <div className="mt-5">{children}</div>

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          {showSave && onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={saveDisabled || saving}
              className={`${primaryBtn} financial-progress-save-btn progress-save-btn min-w-[140px]`}
            >
              {saving ? 'Saving…' : saveLabel}
            </button>
          )}
          <button type="button" onClick={onReset} className={secondaryBtn}>
            Reset
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshDisabled}
            className={`${secondaryBtn} progress-refresh-btn financial-refresh-btn`}
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinancialQuickUpdateCard;
