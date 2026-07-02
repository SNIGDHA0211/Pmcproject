/** DPR Review Dashboard typography — theme-aware (matches getThemeClasses / Financial). */



export function getDprTy(isDark: boolean) {

  const primary = isDark ? 'text-slate-100' : 'text-slate-900';

  const secondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const placeholder = isDark ? 'placeholder:text-slate-500' : 'placeholder:text-slate-400';



  return {

    pageTitle: `text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl ${primary}`,

    pageSubtitle: `text-sm font-medium leading-snug sm:text-base ${secondary}`,

    filterLabel: `mb-1 block text-xs font-semibold uppercase tracking-[0.08em] ${secondary}`,

    filterInput: 'text-sm font-medium',

    sectionTitle: `text-xl font-bold leading-tight sm:text-2xl ${primary}`,

    cardHeading: `text-lg font-semibold leading-snug sm:text-xl ${primary}`,

    metaLabel: `text-xs font-semibold uppercase tracking-[0.08em] ${secondary}`,

    kpiLabel: `text-xs font-semibold uppercase tracking-[0.08em] ${secondary}`,

    kpiValue: (colorClass: string) =>

      `text-3xl font-bold leading-none tabular-nums sm:text-4xl ${colorClass}`,

    statusCardValue: `text-base font-semibold leading-snug ${primary}`,

    tableHeader: `text-xs font-semibold uppercase tracking-[0.08em] ${secondary}`,

    tablePrimary: `text-base font-semibold leading-snug ${primary}`,

    tableSecondary: `text-sm font-medium leading-snug ${secondary}`,

    categoryLabel: `text-xs font-semibold uppercase tracking-[0.08em] ${secondary}`,

    subcategoryName: `text-sm font-medium leading-snug ${primary}`,

    progressPercent: (colorClass: string) =>

      `text-lg font-bold leading-none tabular-nums ${colorClass}`,

    statusBadge: 'text-xs font-semibold normal-case',

    panelSectionTitle: `text-xs font-semibold uppercase tracking-[0.08em] ${secondary}`,

    detailLabel: `text-sm font-medium ${secondary}`,

    detailValue: `text-sm font-bold leading-snug ${primary}`,

    helperText: `text-sm font-normal ${secondary}`,

    workflowStatus: 'text-sm font-semibold leading-snug normal-case',

    textarea: `min-h-[120px] w-full resize-y rounded-xl border p-3 text-sm font-normal leading-relaxed outline-none focus:ring-2 ${primary} ${placeholder}`,

    expandedLabel: `text-xs font-semibold uppercase tracking-[0.08em] ${secondary}`,

    expandedValue: `text-sm font-medium leading-snug ${primary}`,

    summaryCount: 'text-xl font-bold tabular-nums',

    summaryLabel: `text-xs font-medium ${secondary}`,

    emptyStateIcon: isDark ? 'text-slate-500' : 'text-slate-400',

    emptyStateTitle: `text-lg font-semibold ${primary}`,

    emptyStateHint: `text-sm font-normal ${secondary}`,

    iconMuted: secondary,

    jobBadge: isDark

      ? 'rounded-lg bg-indigo-950 px-2.5 py-1 text-xs font-semibold text-indigo-300'

      : 'rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-800',

  } as const;

}



export function getDprKpiValueColors(isDark: boolean) {

  return {

    activities: isDark ? 'text-blue-300' : 'text-blue-600',

    completed: isDark ? 'text-emerald-300' : 'text-emerald-600',

    inProgress: isDark ? 'text-amber-300' : 'text-amber-600',

    delayed: isDark ? 'text-rose-300' : 'text-rose-600',

  };

}



export function getDprSummaryCountColors(isDark: boolean) {

  return {

    completed: isDark ? 'text-emerald-300' : 'text-emerald-700',

    inProgress: isDark ? 'text-amber-300' : 'text-amber-700',

    delayed: isDark ? 'text-rose-300' : 'text-rose-700',

  };

}



export function formatActivityStatusLabel(status: string): string {

  const normalized = status.trim().toLowerCase().replace(/_/g, ' ');

  if (normalized.includes('complete')) return 'Completed';

  if (normalized.includes('progress')) return 'In Progress';

  if (normalized.includes('delay')) return 'Delayed';

  if (normalized.includes('pending')) return 'Pending';

  if (!normalized) return 'Pending';

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());

}


