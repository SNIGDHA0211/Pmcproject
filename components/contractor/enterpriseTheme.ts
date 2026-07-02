/** Contractor Management design system — theme-aware tokens */
import { useMemo } from 'react';
import { getThemeClasses, useTheme } from '../../utils/theme';

export const CM_COLORS = {
  primary: '#4F46E5',
  secondary: '#6366F1',
  accent: '#0EA5E9',
  violet: '#7C3AED',
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  scl: '#1E293B',
} as const;

export type CmModuleAccent = 'contract' | 'invoicing' | 'schedule' | 'bg';

export function parseApiAmount(value: string | number | undefined): number {
  const n = Number(String(value ?? '0').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function formatApiCurrency(value: string | number | undefined): string {
  const n = parseApiAmount(value);
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatApiPercent(value: string | number | undefined): string {
  const n = parseApiAmount(value);
  return `${n.toFixed(n % 1 === 0 ? 0 : 2)}%`;
}

export function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function getCmTheme(isDark: boolean) {
  const tc = getThemeClasses(isDark);

  const card = isDark
    ? `rounded-xl border ${tc.border} glass-card ${tc.textPrimary} shadow-sm transition-all duration-200 hover:border-white/20 hover:shadow-md`
    : 'rounded-xl border border-slate-200/80 bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:border-slate-300/80 hover:shadow-md';

  const panel = isDark
    ? `rounded-2xl border ${tc.border} glass-card ${tc.textPrimary} shadow-lg overflow-hidden`
    : 'rounded-2xl border border-slate-200/80 bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.05)] overflow-hidden';

  const shell = isDark
    ? `rounded-2xl border ${tc.border} glass-card shadow-lg`
    : 'rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/40 shadow-[0_1px_3px_rgba(15,23,42,0.06)]';

  const moduleAccents: Record<CmModuleAccent, string> = isDark
    ? {
        contract: 'border-l-indigo-400 bg-indigo-500/10',
        invoicing: 'border-l-violet-400 bg-violet-500/10',
        schedule: 'border-l-emerald-400 bg-emerald-500/10',
        bg: 'border-l-amber-400 bg-amber-500/10',
      }
    : {
        contract: 'border-l-indigo-500 bg-indigo-50/30',
        invoicing: 'border-l-violet-500 bg-violet-50/30',
        schedule: 'border-l-emerald-500 bg-emerald-50/20',
        bg: 'border-l-amber-500 bg-amber-50/20',
      };

  const timelineHeader = isDark
    ? { scl: `border-b ${tc.border} bg-white/5`, contractor: `border-b ${tc.border} bg-indigo-500/10` }
    : { scl: 'border-b border-slate-100 bg-slate-50', contractor: 'border-b border-indigo-100 bg-indigo-50/50' };

  return {
    isDark,
    tc,
    root: isDark
      ? `rounded-2xl border ${tc.border} glass-card ${tc.textPrimary} p-3 shadow-lg sm:p-4`
      : `rounded-2xl ${tc.textPrimary} p-1 sm:p-2`,
    shell,
    card,
    panel,
    sectionTitle: isDark
      ? `text-[11px] font-bold uppercase tracking-[0.14em] ${tc.textMuted}`
      : 'text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500',
    badge:
      'inline-flex items-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm',
    timestamp: `text-xs ${tc.textMuted}`,
    title: `truncate text-xl font-black tracking-tight sm:text-2xl ${tc.textPrimary}`,
    breadcrumb: `flex items-center gap-1 text-xs ${tc.textMuted}`,
    breadcrumbActive: isDark ? 'font-semibold text-indigo-400' : 'font-semibold text-indigo-600',
    errorBanner: isDark
      ? 'rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300'
      : 'rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700',
    tabs: {
      bar: isDark
        ? `flex gap-1 overflow-x-auto border-t ${tc.border} bg-white/[0.03] p-1.5 scrollbar-thin`
        : 'flex gap-1 overflow-x-auto border-t border-slate-100 bg-slate-50/80 p-1.5 scrollbar-thin',
      active: isDark
        ? 'bg-white/10 text-indigo-300 shadow-md ring-1 ring-indigo-500/30'
        : 'bg-white text-indigo-700 shadow-md ring-1 ring-indigo-100',
      inactive: isDark
        ? `${tc.textMuted} hover:bg-white/5 hover:text-white/80`
        : 'text-slate-500 hover:bg-white/70 hover:text-slate-700',
      base: 'relative shrink-0 rounded-xl px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 sm:px-4 sm:text-[11px]',
    },
    btn: {
      base: 'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-[11px] font-bold uppercase tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:pointer-events-none disabled:opacity-50',
      primary: isDark
        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-900/30 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98]'
        : 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 active:scale-[0.98]',
      secondary: isDark
        ? `border ${tc.border} bg-white/5 ${tc.textPrimary} hover:bg-white/10 active:scale-[0.98]`
        : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]',
    },
    select: {
      label: `mb-1 block text-[10px] font-bold uppercase tracking-widest ${tc.textMuted}`,
      input: isDark
        ? `h-10 w-full rounded-xl border ${tc.border} bg-white/5 px-3 text-sm font-semibold ${tc.textPrimary} shadow-sm outline-none transition-colors placeholder:${tc.textMuted} focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/25`
        : 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 shadow-sm outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25',
      dropdown: isDark
        ? `overflow-hidden rounded-xl border ${tc.border} glass-card shadow-xl`
        : 'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl',
      list: 'max-h-56 overflow-y-auto py-1',
      option: isDark
        ? 'cursor-pointer px-3 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10'
        : 'cursor-pointer px-3 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-indigo-50',
      optionActive: isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700',
      search: isDark
        ? `w-full border-b ${tc.border} bg-transparent px-3 py-2.5 text-sm ${tc.textPrimary} outline-none placeholder:${tc.textMuted}`
        : 'w-full border-b border-slate-100 bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400',
    },
    infoCard: isDark
      ? `flex flex-wrap items-center gap-3 rounded-xl border ${tc.border} bg-gradient-to-r from-indigo-500/10 to-violet-500/10 px-4 py-3 shadow-sm`
      : 'flex flex-wrap items-center gap-3 rounded-xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3 shadow-sm',
    infoIcon: 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm',
    infoTitle: isDark ? 'text-sm font-bold text-white' : 'text-sm font-bold text-indigo-950',
    infoSubtitle: isDark ? 'text-[11px] text-indigo-300/80' : 'text-[11px] text-indigo-600/80',
    content: 'animate-in fade-in duration-300 space-y-4',
    moduleAccents,
    timelineHeader,
    metricBg: isDark ? `rounded-lg ${tc.bgSecondary} px-3 py-2` : 'rounded-lg bg-slate-50 px-3 py-2',
    metricLabel: `text-[10px] font-semibold uppercase ${tc.textMuted}`,
    metricValue: `mt-0.5 text-sm font-black tabular-nums ${tc.textPrimary}`,
    kpiTones: {
      primary: {
        ring: isDark ? 'ring-indigo-500/20' : 'ring-indigo-100',
        icon: isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-500/12 text-indigo-600',
        val: isDark ? 'text-indigo-300' : 'text-indigo-700',
        bg: isDark ? 'bg-gradient-to-br from-white/5 to-indigo-500/10' : 'bg-gradient-to-br from-white to-indigo-50/40',
      },
      success: {
        ring: isDark ? 'ring-emerald-500/20' : 'ring-emerald-100',
        icon: isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-500/12 text-emerald-600',
        val: isDark ? 'text-emerald-300' : 'text-emerald-700',
        bg: isDark ? 'bg-gradient-to-br from-white/5 to-emerald-500/10' : 'bg-gradient-to-br from-white to-emerald-50/40',
      },
      warning: {
        ring: isDark ? 'ring-amber-500/20' : 'ring-amber-100',
        icon: isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-500/12 text-amber-600',
        val: isDark ? 'text-amber-300' : 'text-amber-700',
        bg: isDark ? 'bg-gradient-to-br from-white/5 to-amber-500/10' : 'bg-gradient-to-br from-white to-amber-50/40',
      },
      error: {
        ring: isDark ? 'ring-rose-500/20' : 'ring-rose-100',
        icon: isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-500/12 text-rose-600',
        val: isDark ? 'text-rose-300' : 'text-rose-700',
        bg: isDark ? 'bg-gradient-to-br from-white/5 to-rose-500/10' : 'bg-gradient-to-br from-white to-rose-50/40',
      },
      neutral: {
        ring: isDark ? 'ring-white/10' : 'ring-slate-100',
        icon: isDark ? 'bg-white/10 text-white/70' : 'bg-slate-500/10 text-slate-600',
        val: tc.textPrimary,
        bg: isDark ? 'bg-white/5' : 'bg-white',
      },
    },
    drillAccents: {
      contract: isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-500/12 text-indigo-600',
      invoicing: isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-500/12 text-violet-600',
      schedule: isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-500/12 text-emerald-600',
      bg: isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-500/12 text-amber-600',
    },
    drillArrow: isDark
      ? 'flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/50 transition-all group-hover:bg-indigo-600 group-hover:text-white'
      : 'flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-all group-hover:bg-indigo-600 group-hover:text-white',
    drillTitle: `text-base font-bold ${tc.textPrimary}`,
    drillCard: `${card} group hover:shadow-lg`,
    borderAccents: {
      contract: 'border-t-indigo-500',
      invoicing: 'border-t-violet-500',
      schedule: 'border-t-emerald-500',
      bg: 'border-t-amber-500',
    },
    skeleton: isDark ? 'animate-pulse rounded-xl bg-white/10' : 'animate-pulse rounded-xl bg-slate-200/60',
    emptyIcon: tc.textMuted,
    emptyTitle: `text-sm font-bold ${tc.textPrimary}`,
    emptySubtitle: `text-xs ${tc.textMuted}`,
    bgStatus: {
      updated: isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-500/10 text-emerald-700',
      notUpdated: isDark ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-500/10 text-rose-700',
      pending: isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-500/10 text-amber-700',
    },
    financialWrap: {
      contract: 'w-full overflow-hidden rounded-2xl border-t-[3px] border-t-indigo-500',
      invoicing: 'w-full overflow-hidden rounded-2xl border-t-[3px] border-t-violet-500',
    },
  };
}

export type CmTheme = ReturnType<typeof getCmTheme>;

export function useCmTheme() {
  const { isDarkTheme } = useTheme();
  return useMemo(() => getCmTheme(isDarkTheme), [isDarkTheme]);
}

/** @deprecated use useCmTheme */
export function useCmDashboardTheme() {
  return useCmTheme();
}

/** @deprecated use useCmTheme */
export function useCmOverviewTheme() {
  return useCmTheme();
}
