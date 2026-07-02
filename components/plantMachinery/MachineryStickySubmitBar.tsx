import React from 'react';
import { Icons } from '../Icons';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface MachineryStickySubmitBarProps {
  selectedQuantity: number;
  machineryUpdated: number;
  isSubmitting: boolean;
  disabled: boolean;
  onSubmit: () => void;
}

const MachineryStickySubmitBar: React.FC<MachineryStickySubmitBarProps> = ({
  selectedQuantity,
  machineryUpdated,
  isSubmitting,
  disabled,
  onSubmit,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <div
      className={`pm-sticky-submit fixed bottom-0 left-0 right-0 z-[100] border-t px-4 py-2.5 backdrop-blur-md md:left-[var(--app-sidebar-width,16rem)] md:px-6 ${
        isDarkTheme
          ? 'border-white/10 bg-slate-900/95'
          : 'border-slate-200 bg-white/95 shadow-[0_-4px_20px_rgba(15,23,42,0.08)]'
      }`}
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
          <span className={themeClasses.textSecondary}>
            Selected Quantity:{' '}
            <span className={`tabular-nums ${themeClasses.textPrimary}`}>{selectedQuantity}</span>
          </span>
          <span className={themeClasses.textSecondary}>
            Machinery Updated:{' '}
            <span className={`tabular-nums ${themeClasses.textPrimary}`}>{machineryUpdated}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || isSubmitting}
          className={`submit-machinery-btn pm-submit-button inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${themeClasses.buttonPrimary}`}
        >
          {isSubmitting ? (
            <>
              <Icons.History className="animate-spin" size={16} />
              Submitting...
            </>
          ) : (
            <>
              <Icons.Check size={16} />
              Submit Quantity Selection
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default MachineryStickySubmitBar;
