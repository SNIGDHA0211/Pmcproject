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
  const primaryBtn = `h-11 rounded-lg px-5 text-sm font-semibold transition-colors disabled:opacity-60 ${
    isDarkTheme ? themeClasses.buttonPrimary : 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
  }`;
  const secondaryBtn = `h-11 rounded-lg border px-4 text-sm font-semibold transition-colors disabled:opacity-60 ${
    isDarkTheme
      ? `${themeClasses.buttonSecondary} ${themeClasses.border}`
      : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]'
  }`;

  return (
    <div
      ref={sectionRef}
      id="financial-entry-form"
      className={`financial-form-section financial-quick-update scroll-mt-4 rounded-2xl border ${
        isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-[#E2E8F0] bg-white'
      } ${className}`}
      style={{ borderRadius: 16 }}
    >
      {successBanner && (
        <div
          className={`flex items-center gap-2 border-b px-5 py-3 text-sm font-semibold md:px-6 ${
            isDarkTheme
              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
              : 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]'
          }`}
          role="status"
          aria-live="polite"
        >
          <Icons.Approve size={18} />
          <span>{successBanner}</span>
        </div>
      )}

      <div className="p-5 md:p-6">
        <header>
          <h3
            className={`text-[22px] font-bold leading-tight ${
              isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]'
            }`}
          >
            {title}
          </h3>
          <p
            className={`mt-2 text-sm font-medium leading-snug ${
              isDarkTheme ? themeClasses.textSecondary : 'text-[#64748B]'
            }`}
          >
            {projectName || 'Select a project'} · Reporting period: {periodLabel}
          </p>
          {footerNote && (
            <p className={`mt-2 text-xs font-medium ${themeClasses.textMuted}`}>{footerNote}</p>
          )}
        </header>

        <div className="mt-6">{children}</div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {showSave && onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={saveDisabled || saving}
              className={`${primaryBtn} financial-progress-save-btn progress-save-btn min-w-[120px]`}
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
