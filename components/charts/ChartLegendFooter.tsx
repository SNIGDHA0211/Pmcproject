import React from 'react';
import { getThemeClasses, useTheme } from '../../utils/theme';

export type ChartLegendItem = {
  key?: string;
  label: string;
  color: string;
  variant?: 'solid' | 'dashed';
};

export const ChartLegendFooter: React.FC<{
  items: ChartLegendItem[];
  className?: string;
  borderless?: boolean;
}> = ({ items, className = '', borderless = false }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-3 py-2 sm:gap-x-5 sm:px-4 sm:py-2 ${
        borderless
          ? ''
          : `border-t ${
              isDarkTheme
                ? 'border-white/10 bg-white/[0.03]'
                : 'border-slate-100 bg-slate-50/90'
            }`
      } ${className}`}
      role="list"
      aria-label="Chart legend"
    >
      {items.map((item) => (
        <span
          key={item.key ?? item.label}
          role="listitem"
          className={`inline-flex max-w-full items-center gap-1.5 text-[10px] font-semibold leading-none sm:text-xs ${themeClasses.textSecondary}`}
        >
          {item.variant === 'dashed' ? (
            <span
              className="inline-block w-4 shrink-0 border-t-2 border-dashed"
              style={{ borderColor: item.color }}
              aria-hidden
            />
          ) : (
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
          )}
          <span className="whitespace-nowrap">{item.label}</span>
        </span>
      ))}
    </div>
  );
};

export const ExecutiveChartWithLegend: React.FC<{
  height: number;
  legend: ChartLegendItem[];
  children: React.ReactNode;
  className?: string;
  borderless?: boolean;
}> = ({ height, legend, children, className = '', borderless = false }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <div
      className={
        borderless
          ? `overflow-hidden rounded-xl ${className}`
          : `overflow-hidden rounded-xl border ${
              isDarkTheme
                ? `${themeClasses.border} bg-white/[0.02]`
                : 'border-slate-100 bg-white'
            } ${className}`
      }
    >
      <div className="w-full min-w-0" style={{ height }}>
        {children}
      </div>
      <ChartLegendFooter items={legend} borderless={borderless} />
    </div>
  );
};
