import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface MachineryQtyStepperProps {
  value: string;
  onChange: (value: string) => void;
}

const MachineryQtyStepper: React.FC<MachineryQtyStepperProps> = ({ value, onChange }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const numeric = parseInt(value, 10) || 0;
  const isActive = numeric > 0;

  const adjust = (delta: number) => {
    onChange(String(Math.max(0, numeric + delta)));
  };

  const btnClass = `flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors ${
    isDarkTheme
      ? 'border-white/15 bg-slate-800 hover:bg-white/10'
      : 'border-slate-200 bg-white hover:bg-slate-50'
  }`;

  return (
    <div className="qty-column-tour inline-flex items-center gap-1">
      <button type="button" onClick={() => adjust(-1)} className={btnClass} aria-label="Decrease quantity">
        <Minus size={12} />
      </button>
      <span
        className={`min-w-[2rem] text-center text-xs font-black tabular-nums ${
          isActive
            ? isDarkTheme
              ? 'text-emerald-400'
              : 'text-emerald-700'
            : themeClasses.textMuted
        }`}
      >
        {numeric}
      </span>
      <button type="button" onClick={() => adjust(1)} className={btnClass} aria-label="Increase quantity">
        <Plus size={12} />
      </button>
    </div>
  );
};

export default MachineryQtyStepper;
