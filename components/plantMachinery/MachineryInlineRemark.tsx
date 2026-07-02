import React, { useEffect, useRef } from 'react';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface MachineryInlineRemarkProps {
  remark: string;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onChange: (value: string) => void;
}

const MachineryInlineRemark: React.FC<MachineryInlineRemarkProps> = ({
  remark,
  expanded,
  onExpand,
  onCollapse,
  onChange,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  if (!expanded) {
    const preview = remark.trim();
    return (
      <button
        type="button"
        onClick={onExpand}
        className={`remark-column-tour max-w-full truncate text-left text-[10px] font-semibold underline-offset-2 hover:underline ${
          preview
            ? isDarkTheme
              ? 'text-indigo-300'
              : 'text-indigo-600'
            : themeClasses.textMuted
        }`}
        title={preview || 'Add remark'}
      >
        {preview ? (preview.length > 18 ? `${preview.slice(0, 18)}…` : preview) : 'Add Remark'}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={remark}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCollapse}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'Escape') onCollapse();
      }}
      placeholder="Remark…"
      className={`remark-column-tour w-full min-w-0 rounded-md border px-2 py-1 text-[10px] font-medium outline-none focus:ring-2 ${
        isDarkTheme
          ? 'border-white/10 bg-slate-800 text-slate-200 focus:ring-indigo-500/30'
          : 'border-slate-200 bg-white text-slate-700 focus:ring-indigo-500/20'
      }`}
    />
  );
};

export default MachineryInlineRemark;
