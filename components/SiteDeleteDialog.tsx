import React, { useEffect, useId, useRef } from 'react';
import { ModalPortal } from './ModalPortal';
import { Icons } from './Icons';
import { getThemeClasses, useTheme } from '../utils/theme';

export type SiteDeleteDependency = {
  label: string;
  count?: number;
};

interface SiteDeleteDialogProps {
  open: boolean;
  siteName?: string;
  /** Dialog copy: "Site" (default) or "Project" for portfolio delete. */
  entityLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
  /** Shown when API returns 400 with dependency blockers */
  dependencyError?: string | null;
  dependencies?: SiteDeleteDependency[];
  /** Inline error (403/other) kept in the dialog when appropriate */
  errorMessage?: string | null;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SiteDeleteDialog: React.FC<SiteDeleteDialogProps> = ({
  open,
  siteName,
  entityLabel = 'Site',
  onCancel,
  onConfirm,
  isDeleting = false,
  dependencyError,
  dependencies = [],
  errorMessage,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const labelLower = entityLabel.toLowerCase();

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => cancelRef.current?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, isDeleting, onCancel]);

  const hasDependencyBlock = Boolean(dependencyError) || dependencies.length > 0;

  return (
    <ModalPortal open={open}>
      <div
        className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 p-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !isDeleting) onCancel();
        }}
      >
        <div
          ref={panelRef}
          className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
        >
          <h3
            id={titleId}
            className={`text-lg font-black uppercase tracking-tight ${themeClasses.textPrimary}`}
          >
            Delete {entityLabel}
          </h3>
          <p id={descId} className={`mt-2 text-sm ${themeClasses.textSecondary}`}>
            {hasDependencyBlock
              ? dependencyError ||
                `This ${labelLower} cannot be deleted because it is referenced by existing records.`
              : (
                <>
                  Are you sure you want to delete
                  {siteName ? (
                    <>
                      {' '}
                      <span className={`font-bold ${themeClasses.textPrimary}`}>
                        {siteName}
                      </span>
                    </>
                  ) : (
                    ` this ${labelLower}`
                  )}
                  ?
                  <br />
                  This action cannot be undone.
                </>
              )}
          </p>

          {dependencies.length > 0 && (
            <div
              className={`mt-4 rounded-xl border p-3 ${
                isDarkTheme
                  ? 'border-amber-500/30 bg-amber-500/10'
                  : 'border-amber-200 bg-amber-50'
              }`}
            >
              <p
                className={`mb-2 text-[10px] font-black uppercase tracking-widest ${
                  isDarkTheme ? 'text-amber-300' : 'text-amber-800'
                }`}
              >
                Cannot delete because
              </p>
              <ul className="space-y-1.5">
                {dependencies.map((dep) => (
                  <li
                    key={dep.label}
                    className={`flex items-center justify-between text-sm font-semibold ${themeClasses.textPrimary}`}
                  >
                    <span>{dep.label}</span>
                    {typeof dep.count === 'number' && (
                      <span
                        className={
                          isDarkTheme ? 'text-amber-300' : 'text-amber-700'
                        }
                      >
                        ({dep.count})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {errorMessage && !hasDependencyBlock && (
            <p className="mt-3 text-sm font-semibold text-rose-500" role="alert">
              {errorMessage}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold ${themeClasses.buttonSecondary} ${themeClasses.border} border disabled:opacity-60`}
            >
              Cancel
            </button>
            {!hasDependencyBlock && (
              <button
                type="button"
                onClick={onConfirm}
                disabled={isDeleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <Icons.Loader size={16} className="animate-spin" aria-hidden />
                    Deleting…
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default SiteDeleteDialog;
