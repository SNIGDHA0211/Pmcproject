import React, { useEffect, useId, useRef, useState } from 'react';
import { ModalPortal } from './ModalPortal';
import { Icons } from './Icons';
import { getThemeClasses, useTheme } from '../utils/theme';

interface CompleteBillingDialogProps {
  open: boolean;
  projectName?: string;
  onCancel: () => void;
  onConfirm: (billingCompletionNotes: string) => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const CompleteBillingDialog: React.FC<CompleteBillingDialogProps> = ({
  open,
  projectName,
  onCancel,
  onConfirm,
  isSubmitting = false,
  errorMessage,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) {
      setNotes('');
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => notesRef.current?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
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
  }, [open, isSubmitting, onCancel]);

  return (
    <ModalPortal open={open}>
      <div
        className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 p-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) onCancel();
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
            Complete Billing
          </h3>
          <p id={descId} className={`mt-2 text-sm ${themeClasses.textSecondary}`}>
            Mark billing as completed for
            {projectName ? (
              <>
                {' '}
                <span className={`font-bold ${themeClasses.textPrimary}`}>
                  {projectName}
                </span>
              </>
            ) : (
              ' this project'
            )}
            . Project status stays <strong>Completed</strong>; only billing moves to
            Completed.
          </p>

          <div className="mt-4 space-y-1.5">
            <label
              htmlFor="billing-completion-notes-only"
              className={`block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
            >
              Billing Completion Notes
            </label>
            <textarea
              id="billing-completion-notes-only"
              ref={notesRef}
              rows={3}
              value={notes}
              disabled={isSubmitting}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional remarks (e.g. final bill released)…"
              className={`w-full resize-y rounded-xl border px-3 py-2 text-sm font-semibold outline-none focus:ring-2 disabled:opacity-60 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.placeholder}`}
            />
          </div>

          {errorMessage && (
            <p className="mt-3 text-sm font-semibold text-rose-500" role="alert">
              {errorMessage}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-60 ${themeClasses.buttonSecondary} ${themeClasses.border}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(notes.trim())}
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Icons.Loader size={16} className="animate-spin" aria-hidden />
                  Completing…
                </>
              ) : (
                'Mark Billing Completed'
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default CompleteBillingDialog;
