import React from 'react';
import { createPortal } from 'react-dom';
import { Icons } from './Icons';

export type DashboardToastItem = {
  id: number;
  message: string;
  type: 'success' | 'error';
};

interface DashboardToastStackProps {
  toasts: DashboardToastItem[];
}

/** Fixed toasts on document.body so they sit above the app header (h-16, z-30). */
const DashboardToastStack: React.FC<DashboardToastStackProps> = ({ toasts }) => {
  if (toasts.length === 0 || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="pointer-events-none fixed right-4 top-20 z-[100050] flex max-w-sm flex-col gap-2 sm:right-6"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex animate-in fade-in slide-in-from-top-2 items-start gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-xl duration-200 ${
            t.type === 'success'
              ? 'border-emerald-200 bg-emerald-600 text-white'
              : 'border-rose-200 bg-rose-600 text-white'
          }`}
        >
          {t.type === 'success' ? (
            <Icons.Approve size={18} className="mt-0.5 shrink-0" aria-hidden />
          ) : (
            <Icons.AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
          )}
          <span className="min-w-0 flex-1 leading-snug">{t.message}</span>
        </div>
      ))}
    </div>,
    document.body
  );
};

export default React.memo(DashboardToastStack);
