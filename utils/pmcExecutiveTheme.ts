import { useTheme } from './theme';

export type PmcExecutiveTheme = ReturnType<typeof getPmcExecutiveTheme>;

export function getPmcExecutiveTheme(isDark: boolean) {
  return {
    isDark,

    pageShell: isDark
      ? 'sm:rounded-2xl sm:bg-[#071428]/50 sm:px-3 sm:py-2 md:px-4'
      : 'sm:rounded-2xl sm:bg-slate-50/60 sm:px-3 sm:py-2 md:px-4',

    detailFrame: [
      'pmc-executive-detail rounded-xl border p-2 shadow-sm sm:space-y-3 sm:p-3 md:space-y-4 md:p-4 space-y-3',
      '[&_section]:space-y-3 sm:[&_section]:space-y-4',
      '[&_h3]:tracking-tight',
      '[&_.graphs-analytics-section]:space-y-4 sm:[&_.graphs-analytics-section]:space-y-5',
      isDark
        ? 'border-white/10 bg-gradient-to-b from-[#0b1d36]/95 to-[#071428]/85 [&_.joyride-target-stable]:border-white/10 [&_.joyride-target-stable]:shadow-[0_4px_24px_rgba(0,0,0,0.28)]'
        : 'border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white/50 [&_.joyride-target-stable]:border-slate-200/90 [&_.joyride-target-stable]:shadow-[0_4px_24px_rgba(15,23,42,0.06)]',
    ].join(' '),

    contextBanner: isDark
      ? 'rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center shadow-sm'
      : 'rounded-xl border border-slate-200 bg-slate-100/90 px-4 py-2.5 text-center shadow-sm',
    contextBannerText: isDark
      ? 'text-xs font-semibold text-slate-300 sm:text-sm'
      : 'text-xs font-semibold text-slate-600 sm:text-sm',
    contextBannerAccent: isDark ? 'text-blue-400' : 'text-[#1e3a5f]',

    panel: isDark
      ? 'overflow-hidden rounded-2xl border border-white/10 bg-[#0b1d36]/95 shadow-[0_4px_24px_rgba(0,0,0,0.28)]'
      : 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)]',
    panelHeader: isDark
      ? 'border-b border-white/10 bg-gradient-to-r from-[#1e3a5f]/35 via-[#1e3a5f]/15 to-transparent px-4 py-3.5 sm:px-5 sm:py-4'
      : 'border-b border-slate-100 bg-gradient-to-r from-[#1e3a5f]/8 via-[#1e3a5f]/4 to-transparent px-4 py-3.5 sm:px-5 sm:py-4',
    panelTitle: `text-sm font-black uppercase tracking-wide sm:text-base ${isDark ? 'text-blue-300' : 'text-[#1e3a5f]'}`,
    panelSubtitle: `mt-0.5 text-xs font-medium sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`,

    surface: isDark
      ? 'rounded-2xl border border-white/10 bg-[#0b1d36]/95 shadow-sm'
      : 'rounded-2xl border border-slate-200 bg-white shadow-sm',
    surfaceMuted: isDark ? 'bg-white/5' : 'bg-slate-50/80',

    heading: isDark ? 'text-slate-100' : 'text-slate-800',
    headingStrong: isDark ? 'text-white' : 'text-slate-900',
    label: isDark ? 'text-slate-500' : 'text-slate-400',
    body: isDark ? 'text-slate-300' : 'text-slate-600',
    muted: isDark ? 'text-slate-500' : 'text-slate-500',
    link: isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:underline',

    kpiCard: isDark
      ? 'rounded-xl border border-white/10 bg-[#0f2744]/75 px-3 py-3 shadow-sm sm:px-3.5 sm:py-3.5'
      : 'rounded-xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm sm:px-3.5 sm:py-3.5',
    kpiLabel: 'text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-[11px]',

    tabActive: 'bg-[#1e3a5f] text-white shadow-sm',
    tabInactive: isDark
      ? 'bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10'
      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',

    borderSubtle: isDark ? 'border-white/10' : 'border-slate-100',
    borderDefault: isDark ? 'border-white/10' : 'border-slate-200',
    divide: isDark ? 'divide-white/10' : 'divide-slate-100',

    pulseStrip: isDark
      ? 'overflow-hidden rounded-2xl border border-white/10 bg-[#0b1d36]/95 shadow-[0_4px_20px_rgba(0,0,0,0.25)]'
      : 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]',
    pulseCellBorder: isDark ? 'border-white/10' : 'border-slate-100',
    pulseIconBg: isDark ? 'bg-white/5' : 'bg-slate-50',

    toolbarBorder: isDark ? 'border-white/10' : 'border-slate-100',
    toolbarBtn: isDark
      ? 'inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-300 transition hover:border-blue-500/40 hover:bg-blue-950/50 hover:text-blue-300 sm:text-xs'
      : 'inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:text-xs',

    emptyState: isDark
      ? 'rounded-xl border border-dashed border-white/15 bg-white/5 text-slate-400'
      : 'rounded-xl border border-dashed border-slate-200 bg-slate-50/80 text-slate-500',

    tableHeader: 'bg-[#1e3a5f] text-white',
    tableRowEven: isDark ? 'bg-white/[0.02]' : 'bg-white',
    tableRowOdd: isDark ? 'bg-white/5' : 'bg-slate-50/80',
    tableCell: isDark ? 'text-slate-200' : 'text-slate-800',
    tableCellMuted: isDark ? 'text-slate-500' : 'text-slate-500',

    milestoneCard: isDark
      ? 'rounded-xl border border-white/10 bg-white/5'
      : 'rounded-xl border border-slate-100 bg-slate-50/80',
    milestoneRail: isDark ? 'bg-white/10' : 'bg-slate-200',
    milestoneText: isDark ? 'text-slate-200' : 'text-slate-800',
    milestoneBorderWhite: isDark ? 'border-[#0b1d36]' : 'border-white',

    delayBoxBad: isDark
      ? 'border-rose-800/50 bg-gradient-to-b from-rose-950/50 to-rose-900/25'
      : 'border-rose-200 bg-gradient-to-b from-rose-50 to-rose-100/80',
    delayBoxGood: isDark
      ? 'border-emerald-800/50 bg-gradient-to-b from-emerald-950/50 to-emerald-900/25'
      : 'border-emerald-200 bg-gradient-to-b from-emerald-50 to-emerald-100/80',

    alert: isDark
      ? 'flex items-center justify-between gap-3 rounded-xl border border-amber-700/40 bg-amber-950/35 px-4 py-2.5 text-sm font-semibold text-amber-200'
      : 'flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900',
    alertDismiss: isDark
      ? 'rounded-lg p-1 text-amber-300 transition hover:bg-amber-900/40'
      : 'rounded-lg p-1 text-amber-700 transition hover:bg-amber-100',

    footer: isDark
      ? 'rounded-xl border border-white/10 bg-[#0b1d36]/80 px-4 py-3 text-center text-xs text-slate-400 sm:text-sm'
      : 'rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-500 sm:text-sm',

    queueItem: isDark
      ? 'flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'
      : 'flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
    queueClear: isDark
      ? 'rounded-xl border border-emerald-800/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300'
      : 'rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800',
    queueActionBtn: isDark
      ? 'shrink-0 rounded-lg border border-blue-500/30 bg-blue-950/40 px-3 py-1.5 text-xs font-bold text-blue-300 transition hover:bg-blue-900/50'
      : 'shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-50',

    progressTrack: isDark ? 'bg-white/10' : 'bg-slate-100',
    metricCell: isDark
      ? 'flex min-w-0 flex-col rounded-xl border border-white/10 bg-[#0f2744]/60 p-3 shadow-sm ring-1 ring-white/5'
      : 'flex min-w-0 flex-col rounded-xl border border-slate-100 bg-white p-3 shadow-sm ring-1 ring-slate-100/80',
    progressInsight: isDark
      ? 'rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-[#0b1d36] p-4 sm:p-5'
      : 'rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5',
    miniDonut: isDark
      ? 'flex min-w-0 flex-col items-center rounded-xl border border-white/10 bg-white/5 px-2 py-2.5'
      : 'flex min-w-0 flex-col items-center rounded-xl border border-slate-100 bg-slate-50/60 px-2 py-2.5',

    skeleton: isDark ? 'bg-white/10' : 'bg-slate-100',
    statCard: isDark
      ? 'rounded-xl border border-white/10 bg-white/5'
      : 'rounded-xl border border-slate-100 bg-slate-50/90',
    hsePyramidWrap: isDark
      ? 'h-[176px] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-blue-950/30'
      : 'h-[176px] overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-blue-50/40',

    iconBox: 'flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e3a5f] text-white',

    summaryGridGap: isDark ? 'bg-white/10' : 'bg-slate-100',
    summaryGridCell: isDark ? 'bg-[#0b1d36]/95' : 'bg-white',

    roseText: isDark ? 'text-rose-400' : 'text-rose-600',
    amberText: isDark ? 'text-amber-400' : 'text-amber-600',
    emeraldText: isDark ? 'text-emerald-400' : 'text-emerald-600',
    slateValue: isDark ? 'text-slate-200' : 'text-slate-800',

    roseIconWrap: isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-600',
    emeraldIconWrap: isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
    amberIconWrap: isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600',

    compliancePill: {
      compliant: isDark
        ? 'bg-emerald-500/15 text-emerald-400 ring-emerald-800'
        : 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      'non-compliant': isDark
        ? 'bg-rose-500/15 text-rose-400 ring-rose-800'
        : 'bg-rose-50 text-rose-700 ring-rose-200',
      'at-risk': isDark
        ? 'bg-amber-500/15 text-amber-400 ring-amber-800'
        : 'bg-amber-50 text-amber-800 ring-amber-200',
      neutral: isDark
        ? 'bg-white/10 text-slate-300 ring-white/15'
        : 'bg-slate-50 text-slate-700 ring-slate-200',
    } as const,

    priorityPill: {
      Critical: isDark
        ? 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-800'
        : 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
      Urgent: isDark
        ? 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-800'
        : 'bg-orange-100 text-orange-700 ring-1 ring-orange-200',
      High: isDark
        ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-800'
        : 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    } as const,

    criticalBadge: isDark
      ? 'rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-rose-400'
      : 'rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-rose-700',

    onTrackBadge: isDark
      ? 'rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-800'
      : 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200',

    editBtn: isDark
      ? 'inline-flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-950/40 px-2 py-1 text-[10px] font-bold text-blue-300 transition hover:bg-blue-900/50 sm:text-xs'
      : 'inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 transition hover:bg-blue-100 sm:text-xs',

    timelineEmpty: isDark
      ? 'rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-center text-sm text-slate-400'
      : 'rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500',

    trackLabel: isDark ? 'text-slate-300' : 'text-slate-600',
    trackMeta: isDark ? 'text-slate-500' : 'text-slate-400',
    trackLegend: isDark ? 'text-slate-400' : 'text-slate-500',

    manhoursCard: isDark
      ? 'flex items-center gap-2 rounded-xl border border-blue-800/40 bg-blue-950/30 px-2.5 py-2'
      : 'flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/80 px-2.5 py-2',
    lossHoursCard: isDark
      ? 'flex items-center gap-2 rounded-xl border border-rose-800/40 bg-rose-950/30 px-2.5 py-2'
      : 'flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50/80 px-2.5 py-2',

    performanceTile: isDark
      ? 'relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1d36]/95 shadow-sm'
      : 'relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm',

    dividerGradient: isDark
      ? 'h-px bg-gradient-to-r from-transparent via-white/10 to-transparent'
      : 'h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent',

    /** Executive shell chrome (project switcher + tab strip + updates) */
    shellHeader: isDark
      ? 'overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-[#0f2744] via-[#1e3a5f] to-[#1e3a5f] text-white shadow-[0_4px_20px_rgba(15,39,68,0.35)]'
      : 'overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-[0_4px_20px_rgba(15,23,42,0.06)]',
    shellTitle: isDark
      ? 'truncate text-base font-bold tracking-tight text-white sm:text-lg'
      : 'truncate text-base font-bold tracking-tight text-[#1e3a5f] sm:text-lg',
    shellSelect: isDark
      ? 'w-full min-w-0 cursor-pointer appearance-none truncate rounded-lg border border-white/15 bg-white/10 py-1.5 pl-3 pr-8 text-xs font-semibold text-white outline-none backdrop-blur-sm transition hover:bg-white/15 focus:border-white/30 focus:ring-2 focus:ring-white/20 disabled:cursor-wait disabled:opacity-70 sm:text-sm'
      : 'w-full min-w-0 cursor-pointer appearance-none truncate rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-800 outline-none transition hover:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-wait disabled:opacity-70 sm:text-sm',
    shellSelectChevron: isDark ? 'text-white/60' : 'text-slate-400',
    shellNav: isDark
      ? 'flex gap-1 overflow-x-auto border-t border-white/10 bg-black/10 px-2 py-1.5 scrollbar-thin sm:px-3'
      : 'flex gap-1 overflow-x-auto border-t border-slate-100 bg-slate-50/90 px-2 py-1.5 scrollbar-thin sm:px-3',
    shellTabActive: isDark
      ? 'bg-white/20 text-white ring-1 ring-white/25'
      : 'bg-[#1e3a5f] text-white shadow-sm',
    shellTabInactive: isDark
      ? 'text-blue-100/80 hover:bg-white/10 hover:text-white'
      : 'text-slate-600 hover:bg-white hover:text-slate-900 ring-1 ring-transparent hover:ring-slate-200',
    shellTabBadgeCritical: isDark
      ? 'bg-rose-500/90 text-white ring-1 ring-white/25'
      : 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
    shellTabBadgeWatch: isDark
      ? 'bg-amber-400 text-[#1a1520] ring-1 ring-white/20'
      : 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    shellBtnSecondary: isDark
      ? 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15 sm:text-sm'
      : 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:text-sm',
    shellBtnBrief: isDark
      ? 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-300/30 bg-sky-500/20 px-3 py-2 text-xs font-semibold text-sky-50 transition hover:bg-sky-500/30 sm:text-sm'
      : 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-100 sm:text-sm',
    shellBtnEscalate:
      'inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-400 sm:text-sm',
    shellUpdates: isDark
      ? 'flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border border-white/12 bg-[#122a45]/55 px-3 py-2'
      : 'flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm',
    shellUpdatesLabel: isDark
      ? 'text-[10px] font-bold uppercase tracking-wide text-slate-200'
      : 'text-[10px] font-bold uppercase tracking-wide text-[#1e3a5f]',
    shellUpdatesCount: isDark
      ? 'ml-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded bg-slate-200 px-1 text-[9px] font-bold text-[#0f2744]'
      : 'ml-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded bg-[#1e3a5f] px-1 text-[9px] font-bold text-white',
    shellUpdatesDivider: isDark ? 'hidden h-3.5 w-px bg-white/15 sm:block' : 'hidden h-3.5 w-px bg-slate-200 sm:block',
    shellUpdatePill: isDark
      ? 'inline-flex max-w-full items-center gap-1.5 rounded-md border border-white/10 bg-[#163352] px-2.5 py-1 text-left transition hover:bg-[#1a3a5c] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/30'
      : 'inline-flex max-w-full items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-left shadow-sm transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]/20',
    shellUpdatePillCritical: isDark ? 'border-l-2 border-l-rose-400' : 'border-l-2 border-l-rose-500',
    shellUpdatePillWatch: isDark ? 'border-l-2 border-l-amber-400' : 'border-l-2 border-l-amber-500',
    shellUpdateText: isDark ? 'truncate text-[11px] font-semibold text-slate-100' : 'truncate text-[11px] font-semibold text-slate-800',
    shellUpdateHint: isDark ? 'font-medium text-slate-300' : 'font-medium text-slate-600',
  };
}

export function usePmcExecutiveTheme() {
  const { isDarkTheme } = useTheme();
  return getPmcExecutiveTheme(isDarkTheme);
}

export function pmcRiskPulseTone(
  kind: 'rose' | 'amber' | 'yellow' | 'emerald',
  isDark: boolean,
): string {
  const map = {
    rose: isDark ? 'text-rose-400' : 'text-rose-600',
    amber: isDark ? 'text-amber-400' : 'text-amber-600',
    yellow: isDark ? 'text-yellow-400' : 'text-yellow-600',
    emerald: isDark ? 'text-emerald-400' : 'text-emerald-600',
  };
  return map[kind];
}
