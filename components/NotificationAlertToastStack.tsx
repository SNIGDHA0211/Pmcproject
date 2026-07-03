import React from 'react';
import { createPortal } from 'react-dom';
import { Icons } from './Icons';

export type AlertToastItem = {
  id: number;
  title: string;
  message: string;
};

interface NotificationAlertToastStackProps {
  toasts: AlertToastItem[];
}

const NotificationAlertToastStack: React.FC<NotificationAlertToastStackProps> = ({ toasts }) => {
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
          className="pointer-events-auto flex animate-in fade-in slide-in-from-top-2 items-start gap-3 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm shadow-xl duration-200 dark:border-indigo-500/30 dark:bg-slate-900"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
            <Icons.Finance size={16} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-black uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
              {t.title}
            </p>
            <p className="mt-1 text-xs font-medium leading-snug text-slate-600 dark:text-slate-300">
              {t.message}
            </p>
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
};

export default React.memo(NotificationAlertToastStack);
