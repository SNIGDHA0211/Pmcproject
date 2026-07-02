import React, { useState } from 'react';
import { Icons } from './Icons';
import { ModalPortal } from './ModalPortal';
import { DIVISION_BY_ZERO_NOTE, type DashboardFormulaSpec } from '../utils/dashboardFormulas';
import { getThemeClasses, useTheme } from '../utils/theme';

export type FormulaInfoButtonProps = Omit<DashboardFormulaSpec, 'apiEndpoint'> & {
  iconSize?: number;
  className?: string;
};

/** Consistent top-right action group: formula (i) then edit/other controls */
export const CardHeaderActions: React.FC<{
  children: React.ReactNode;
  /**
   * Inset actions from the card edge when wrapped by FullScreenCard chrome.
   * - expand: clears fullscreen expand button (~40px from right)
   * - expand-edit: clears expand + floating edit (~72px from right)
   */
  reserveExpandSpace?: boolean | 'expand' | 'expand-edit';
  /** When true, caller renders expand inline — skip reserved right padding */
  inlineExpand?: boolean;
  className?: string;
}> = ({ children, reserveExpandSpace = false, inlineExpand = false, className = '' }) => {
  const paddingClass =
    inlineExpand
      ? ''
        : reserveExpandSpace === 'expand-edit'
          ? 'pr-[5.5rem]'
          : reserveExpandSpace === 'expand' || reserveExpandSpace === true
            ? 'pr-[2.75rem]'
            : '';

  return (
    <div className={`ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2 ${paddingClass} ${className}`}>
      {children}
    </div>
  );
};

const cardActionButtonClass =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-blue-400';

/** Bordered icon buttons (expand) — aligned with info/edit controls */
export const cardExpandButtonClassName =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-blue-400';

/** Compact toolbar for card header icon actions — info, edit, expand */
export const CardActionToolbar: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`flex shrink-0 flex-wrap items-center justify-end gap-2 ${className}`}>{children}</div>
);

/** Shared edit icon button — same size on every dashboard card */
export const cardEditButtonClassName = cardActionButtonClass;

/** Info / formula button — blue accent on hover only */
const infoButtonClass = cardActionButtonClass;

export const CardEditButton: React.FC<{
  onClick: () => void;
  title: string;
  className?: string;
  disabled?: boolean;
}> = ({ onClick, title, className = '', disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`${cardEditButtonClassName} disabled:pointer-events-none disabled:opacity-50 ${className}`}
    title={title}
    aria-label={title}
  >
    <Icons.Edit size={16} />
  </button>
);

/** Shared add (+) icon button for dashboard cards */
export const CardAddButton: React.FC<{
  onClick: () => void;
  title: string;
  className?: string;
  disabled?: boolean;
}> = ({ onClick, title, className = '', disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`${cardEditButtonClassName} disabled:pointer-events-none disabled:opacity-50 ${className}`}
    title={title}
    aria-label={title}
  >
    <Icons.Add size={16} />
  </button>
);

export const CardExpandButton: React.FC<{
  onClick: () => void;
  title: string;
  className?: string;
  disabled?: boolean;
}> = ({ onClick, title, className = '', disabled = false }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${cardExpandButtonClassName} ${themeClasses.border} disabled:pointer-events-none disabled:opacity-40 ${className}`}
      title={title}
      aria-label={title}
    >
      <Icons.FullScreen size={16} />
    </button>
  );
};

export const FormulaInfoButton: React.FC<FormulaInfoButtonProps> = ({
  title,
  calculatedFields = [],
  formulas,
  statusRules = [],
  notes = [],
  iconSize = 16,
  className = '',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${infoButtonClass} ${className}`}
        title="View formula"
        aria-label={`View formula for ${title}`}
      >
        <Icons.Info size={iconSize} strokeWidth={2.5} />
      </button>

      <ModalPortal open={open}>
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-lg ${
              isDarkTheme ? `${themeClasses.bgPrimary} ${themeClasses.border}` : ''
            }`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="formula-modal-title"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3
                id="formula-modal-title"
                className={`min-w-0 flex-1 text-base font-black uppercase tracking-tight ${isDarkTheme ? 'text-blue-300' : 'text-blue-700'}`}
              >
                {title}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  isDarkTheme ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
              >
                Close
              </button>
            </div>

            {calculatedFields.length > 0 && (
              <section className="mb-4">
                <h4 className={`mb-2 text-[10px] font-black uppercase tracking-widest ${themeClasses.textMuted}`}>
                  Calculated fields
                </h4>
                <ul className={`list-inside list-disc space-y-1 text-xs font-semibold ${themeClasses.textSecondary}`}>
                  {calculatedFields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mb-4">
              <h4 className={`mb-2 text-[10px] font-black uppercase tracking-widest ${themeClasses.textMuted}`}>
                Formulas
              </h4>
              <ul className="space-y-2">
                {formulas.map((formula) => (
                  <li
                    key={formula}
                    className={`rounded-lg border px-3 py-2 font-mono text-xs leading-relaxed ${
                      isDarkTheme
                        ? 'border-slate-600 bg-slate-800/80 text-slate-200'
                        : 'border-slate-200 bg-slate-50 text-slate-800'
                    }`}
                  >
                    {formula}
                  </li>
                ))}
              </ul>
            </section>

            {statusRules.length > 0 && (
              <section className="mb-4">
                <h4 className={`mb-2 text-[10px] font-black uppercase tracking-widest ${themeClasses.textMuted}`}>
                  Status
                </h4>
                <ul className="space-y-1.5">
                  {statusRules.map((rule) => (
                    <li
                      key={rule}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        isDarkTheme
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {rule}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {notes.length > 0 && (
              <section className="mb-4">
                <h4 className={`mb-2 text-[10px] font-black uppercase tracking-widest ${themeClasses.textMuted}`}>
                  Notes
                </h4>
                <ul className={`list-inside list-disc space-y-1 text-xs font-medium ${themeClasses.textSecondary}`}>
                  {notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </section>
            )}

            <p
              className={`rounded-lg border px-3 py-2 text-[11px] font-medium italic ${
                isDarkTheme
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              {DIVISION_BY_ZERO_NOTE}
            </p>
          </div>
        </div>
      </ModalPortal>
    </>
  );
};

export default FormulaInfoButton;
