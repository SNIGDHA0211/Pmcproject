/** Shared Recharts styling for Projects dashboard analytics. */

import { formatIndianCurrencyCompact } from './format';

export const chartGridStroke = (isDarkTheme: boolean) =>
  isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.08)';

export const chartAxisStroke = (isDarkTheme: boolean) =>
  isDarkTheme ? 'rgba(148, 163, 184, 0.5)' : 'rgba(71, 85, 105, 0.65)';

/** Axis label fill — high contrast on white cards */
export const chartTickFill = (isDarkTheme: boolean) =>
  isDarkTheme ? '#e2e8f0' : '#334155';

export const chartAxisTick = (isDarkTheme: boolean, fontSize = 12) => ({
  fill: chartTickFill(isDarkTheme),
  fontSize,
  fontWeight: 600 as const,
});

export const chartTooltipStyle = (isDarkTheme: boolean) => ({
  background: isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
  border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
  borderRadius: '0.5rem',
  color: isDarkTheme ? '#fff' : '#0f172a',
  fontSize: 12,
});

export const chartLineBarMargin = (isExpanded = false) => ({
  top: 8,
  right: 12,
  left: isExpanded ? 64 : 56,
  bottom: isExpanded ? 48 : 44,
});

export const chartPlotMargin = chartLineBarMargin(false);

export function formatChartCurrencyAxisTick(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return formatIndianCurrencyCompact(n).replace('₹', '').trim();
}

export function formatChartCountAxisTick(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/** Fit Y-axis to data with headroom — avoids large empty bands on sparse charts. */
export function getChartNumericYMax(values: number[], padRatio = 0.12): number | undefined {
  const finite = values.filter((v) => Number.isFinite(v) && v > 0);
  if (finite.length === 0) return undefined;
  const max = Math.max(...finite);
  return Math.ceil(max * (1 + padRatio));
}

export const chartXAxisMonthProps = {
  angle: -28,
  textAnchor: 'end' as const,
  height: 48,
  tickMargin: 8,
  interval: 'preserveStartEnd' as const,
  minTickGap: 4,
};

/** Horizontal month labels for 1–3 data points (no slant, less vertical padding). */
export const chartXAxisMonthPropsSparse = {
  angle: 0,
  textAnchor: 'middle' as const,
  height: 28,
  tickMargin: 6,
  interval: 0 as const,
  minTickGap: 0,
};

/** Wider tick spacing for dense executive dashboards */
export const chartXAxisMonthPropsExecutive = {
  angle: -32,
  textAnchor: 'end' as const,
  height: 52,
  tickMargin: 10,
  interval: 'preserveStartEnd' as const,
  minTickGap: 28,
};

export const chartPlotMarginExecutive = {
  top: 8,
  right: 12,
  left: 48,
  bottom: 4,
};

export const chartBarPlotMarginExecutive = {
  top: 6,
  right: 8,
  left: 40,
  bottom: 4,
};

export const chartLegendProps = (legendFontSize: number, isDarkTheme = false) => ({
  wrapperStyle: {
    fontSize: `${legendFontSize}px`,
    paddingTop: 8,
    paddingBottom: 4,
    lineHeight: 1.35,
    color: isDarkTheme ? '#e2e8f0' : '#334155',
  },
  iconSize: 8,
  iconType: 'circle' as const,
  verticalAlign: 'bottom' as const,
  align: 'center' as const,
  height: 32,
});

/** Bar charts with in-chart legend — keep legend below axis labels */
export const chartBarLegendProps = (legendFontSize: number, isDarkTheme = false) => ({
  ...chartLegendProps(legendFontSize, isDarkTheme),
  wrapperStyle: {
    ...chartLegendProps(legendFontSize, isDarkTheme).wrapperStyle,
    paddingTop: 6,
    marginTop: 0,
  },
});

export const chartActiveDot = { r: 4, strokeWidth: 0 };

export const DASHBOARD_CHART_SHELL_PADDING = 'px-3 py-2.5 sm:px-4 sm:py-3';

export const DASHBOARD_CHART_MIN_HEIGHT = 260;

export const DASHBOARD_CHART_MIN_HEIGHT_BAR = 240;

export const DASHBOARD_CHART_MIN_HEIGHT_EXPANDED = 460;

export const dashboardChartShellBorder = (isDarkTheme: boolean) =>
  isDarkTheme ? 'border-white/10 shadow-sm' : 'border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.04)]';
