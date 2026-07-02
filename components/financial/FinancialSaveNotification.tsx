import React from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '../Icons';
import { useTheme } from '../../utils/theme';

export type FinancialSaveNotificationItem = {
  id: number;
  type: 'success' | 'error';
  message: string;
};

interface FinancialSaveNotificationProps {
  items: FinancialSaveNotificationItem[];
  onDismiss: (id: number) => void;
}

const FinancialSaveNotification: React.FC<FinancialSaveNotificationProps> = ({ items, onDismiss }) => {
  const { isDarkTheme } = useTheme();

  if (items.length === 0) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed top-20 right-4 z-[9999] flex max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((item) => {
        const isSuccess = item.type === 'success';
        return (
          <div
            key={item.id}
            role="alert"
            className={`pointer-events-auto flex animate-in fade-in slide-in-from-top-2 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-xl duration-200 ${
              isSuccess
                ? isDarkTheme
                  ? 'bg-emerald-500/90 text-white'
                  : 'bg-emerald-600 text-white'
                : isDarkTheme
                  ? 'bg-rose-500/90 text-white'
                  : 'bg-rose-600 text-white'
            }`}
          >
            {isSuccess ? <Icons.Approve size={16} /> : <Icons.AlertCircle size={16} />}
            <span className="min-w-0 flex-1 leading-snug">{item.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              className="shrink-0 rounded-md p-0.5 opacity-80 transition-opacity hover:opacity-100"
              aria-label="Dismiss notification"
            >
              <Icons.Close size={14} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
};

export default React.memo(FinancialSaveNotification);
