import { useTheme } from './theme';

export type PmcExecutiveTheme = ReturnType<typeof getPmcExecutiveTheme>;

export function getPmcExecutiveTheme(isDark: boolean) {
  return {
    isDark,

    pageShell: isDark
      ? 'sm:rounded-2xl sm:bg-[#071428]/35 sm:px-3 sm:py-2 md:px-4 sm:backdrop-blur-md'
      : 'sm:rounded-2xl sm:bg-white/35 sm:px-3 sm:py-2 md:px-4 sm:backdrop-blur-md',

    detailFrame: [
      'pmc-executive-detail rounded-xl border p-2 shadow-sm sm:space-y-3 sm:p-3 md:space-y-4 md:p-4 space-y-3',
      '[&_section]:space-y-3 sm:[&_section]:space-y-4',
      '[&_h3]:tracking-tight',
      '[&_.graphs-analytics-section]:space-y-4 sm:[&_.graphs-analytics-section]:space-y-5',
      isDark
        ? 'pmc360-glass-panel-dark [&_.joyride-target-stable]:border-cyan-400/20 [&_.joyride-target-stable]:shadow-[0_4px_24px_rgba(0,0,0,0.28)]'
        : 'pmc360-glass-panel-light [&_.joyride-target-stable]:border-cyan-200/60 [&_.joyride-target-stable]:shadow-[0_4px_24px_rgba(15,23,42,0.06)]',
    ].join(' '),

    contextBanner: isDark
      ? 'rounded-xl border border-cyan-400/20 bg-white/8 px-4 py-2.5 text-center shadow-sm backdrop-blur-md'
      : 'rounded-xl border border-cyan-200/50 bg-white/55 px-4 py-2.5 text-center shadow-sm backdrop-blur-md',
    contextBannerText: isDark
      ? 'text-xs font-semibold text-slate-300 sm:text-sm'
      : 'text-xs font-semibold text-slate-600 sm:text-sm',
    contextBannerAccent: isDark ? 'text-cyan-300' : 'text-cyan-800',

    panel: isDark
      ? 'overflow-hidden rounded-2xl pmc360-glass-panel-dark'
      : 'overflow-hidden rounded-2xl pmc360-glass-panel-light',
    panelHeader: isDark
      ? 'border-b border-cyan-400/15 bg-gradient-to-r from-cyan-500/10 via-transparent to-transparent px-4 py-3.5 sm:px-5 sm:py-4'
      : 'border-b border-cyan-200/40 bg-gradient-to-r from-cyan-50/50 via-transparent to-transparent px-4 py-3.5 sm:px-5 sm:py-4',
    panelTitle: `text-sm font-black uppercase tracking-wide sm:text-base ${isDark ? 'text-cyan-300' : 'text-cyan-900'}`,
    panelSubtitle: `mt-0.5 text-xs font-medium sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`,

    surface: isDark
      ? 'rounded-2xl pmc360-glass-dark'
      : 'rounded-2xl pmc360-glass-light',
    surfaceMuted: isDark ? 'bg-white/8' : 'bg-white/45',

    heading: isDark ? 'text-slate-100' : 'text-slate-800',
    headingStrong: isDark ? 'text-white' : 'text-slate-900',
    label: isDark ? 'text-slate-500' : 'text-slate-400',
    body: isDark ? 'text-slate-300' : 'text-slate-600',
    muted: isDark ? 'text-slate-500' : 'text-slate-500',
    link: isDark ? 'text-cyan-300 hover:text-cyan-200' : 'text-cyan-700 hover:underline',

    kpiCard: isDark
      ? 'rounded-xl pmc360-glass-dark px-3 py-3 sm:px-3.5 sm:py-3.5'
      : 'rounded-xl pmc360-glass-light px-3 py-3 sm:px-3.5 sm:py-3.5',
    kpiLabel: 'text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-[11px]',

    tabActive: isDark
      ? 'bg-cyan-500/25 text-cyan-50 ring-1 ring-cyan-400/35 shadow-sm'
      : 'bg-[#1e3a5f] text-white shadow-sm',
    tabInactive: isDark
      ? 'bg-white/8 text-slate-300 ring-1 ring-white/12 hover:bg-white/12'
      : 'bg-white/60 text-slate-600 ring-1 ring-slate-200/80 hover:bg-white/80 backdrop-blur-sm',

    borderSubtle: isDark ? 'border-white/10' : 'border-slate-100',
    borderDefault: isDark ? 'border-cyan-400/15' : 'border-cyan-200/50',
    divide: isDark ? 'divide-white/10' : 'divide-slate-100',

    pulseStrip: isDark
      ? 'overflow-hidden rounded-2xl pmc360-glass-panel-dark'
      : 'overflow-hidden rounded-2xl pmc360-glass-panel-light',
    pulseCellBorder: isDark ? 'border-white/10' : 'border-cyan-100/60',
    pulseIconBg: isDark ? 'bg-white/8' : 'bg-white/55',

    toolbarBorder: isDark ? 'border-cyan-400/15' : 'border-cyan-200/40',
    toolbarBtn: isDark
      ? 'inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-300 backdrop-blur-sm transition hover:border-cyan-400/40 hover:bg-cyan-950/40 hover:text-cyan-200 sm:text-xs'
      : 'inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-cyan-200/60 bg-white/65 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 backdrop-blur-sm transition hover:border-cyan-300 hover:bg-cyan-50/80 hover:text-cyan-800 sm:text-xs',

    emptyState: isDark
      ? 'rounded-xl border border-dashed border-cyan-400/25 bg-white/5 text-slate-400 backdrop-blur-sm'
      : 'rounded-xl border border-dashed border-cyan-300/50 bg-white/45 text-slate-500 backdrop-blur-sm',

    tableHeader: 'bg-[#1e3a5f] text-white',
    tableRowEven: isDark ? 'bg-white/[0.03]' : 'bg-white/40',
    tableRowOdd: isDark ? 'bg-white/[0.06]' : 'bg-slate-50/50',
    tableCell: isDark ? 'text-slate-200' : 'text-slate-800',
    tableCellMuted: isDark ? 'text-slate-500' : 'text-slate-500',

    milestoneCard: isDark
      ? 'rounded-xl border border-white/10 bg-white/8 backdrop-blur-sm'
      : 'rounded-xl border border-cyan-100/60 bg-white/55 backdrop-blur-sm',
    milestoneRail: isDark ? 'bg-white/10' : 'bg-slate-200/70',
    milestoneText: isDark ? 'text-slate-200' : 'text-slate-800',
    milestoneBorderWhite: isDark ? 'border-[#0b1d36]' : 'border-white',

    delayBoxBad: isDark
      ? 'border-rose-800/50 bg-gradient-to-b from-rose-950/50 to-rose-900/25'
      : 'border-rose-200 bg-gradient-to-b from-rose-50/90 to-rose-100/70 backdrop-blur-sm',
    delayBoxGood: isDark
      ? 'border-emerald-800/50 bg-gradient-to-b from-emerald-950/50 to-emerald-900/25'
      : 'border-emerald-200 bg-gradient-to-b from-emerald-50/90 to-emerald-100/70 backdrop-blur-sm',

    alert: isDark
      ? 'flex items-center justify-between gap-3 rounded-xl border border-amber-700/40 bg-amber-950/35 px-4 py-2.5 text-sm font-semibold text-amber-200 backdrop-blur-sm'
      : 'flex items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-2.5 text-sm font-semibold text-amber-900 backdrop-blur-sm',
    alertDismiss: isDark
      ? 'rounded-lg p-1 text-amber-300 transition hover:bg-amber-900/40'
      : 'rounded-lg p-1 text-amber-700 transition hover:bg-amber-100',

    footer: isDark
      ? 'rounded-xl pmc360-glass-dark px-4 py-3 text-center text-xs text-slate-400 sm:text-sm'
      : 'rounded-xl pmc360-glass-light px-4 py-3 text-center text-xs text-slate-500 sm:text-sm',

    queueItem: isDark
      ? 'flex flex-col gap-3 rounded-xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between'
      : 'flex flex-col gap-3 rounded-xl border border-cyan-100/60 bg-white/55 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between',
    queueClear: isDark
      ? 'rounded-xl border border-emerald-800/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300'
      : 'rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800 backdrop-blur-sm',
    queueActionBtn: isDark
      ? 'shrink-0 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 text-xs font-bold text-cyan-300 transition hover:bg-cyan-900/50'
      : 'shrink-0 rounded-lg border border-cyan-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-cyan-800 transition hover:bg-cyan-50',

    progressTrack: isDark ? 'bg-white/10' : 'bg-slate-200/55',
    metricCell: isDark
      ? 'flex min-w-0 flex-col rounded-xl pmc360-glass-dark p-3'
      : 'flex min-w-0 flex-col rounded-xl pmc360-glass-light p-3',
    progressInsight: isDark
      ? 'rounded-2xl pmc360-glass-dark p-4 sm:p-5'
      : 'rounded-2xl pmc360-glass-light p-4 sm:p-5',
    miniDonut: isDark
      ? 'flex min-w-0 flex-col items-center rounded-xl border border-white/10 bg-white/8 px-2 py-2.5 backdrop-blur-sm'
      : 'flex min-w-0 flex-col items-center rounded-xl border border-cyan-100/60 bg-white/50 px-2 py-2.5 backdrop-blur-sm',

    skeleton: isDark ? 'bg-white/10' : 'bg-slate-200/50',
    statCard: isDark
      ? 'rounded-xl pmc360-glass-dark'
      : 'rounded-xl pmc360-glass-light',
    hsePyramidWrap: isDark
      ? 'h-[176px] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/8 to-cyan-950/30 backdrop-blur-sm'
      : 'h-[176px] overflow-hidden rounded-xl border border-cyan-100/60 bg-gradient-to-br from-white/60 to-cyan-50/40 backdrop-blur-sm',

    iconBox: 'flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e3a5f] text-white',

    summaryGridGap: isDark ? 'bg-white/10' : 'bg-cyan-100/50',
    summaryGridCell: isDark ? 'pmc360-glass-dark' : 'pmc360-glass-light',

    roseText: isDark ? 'text-rose-400' : 'text-rose-600',
    amberText: isDark ? 'text-amber-400' : 'text-amber-600',
    emeraldText: isDark ? 'text-emerald-400' : 'text-emerald-600',
    slateValue: isDark ? 'text-slate-200' : 'text-slate-800',

    roseIconWrap: isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50/80 text-rose-600',
    emeraldIconWrap: isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50/80 text-emerald-600',
    amberIconWrap: isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50/80 text-amber-600',

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
        : 'bg-white/60 text-slate-700 ring-slate-200',
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
      ? 'inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-2 py-1 text-[10px] font-bold text-cyan-300 transition hover:bg-cyan-900/50 sm:text-xs'
      : 'inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50/80 px-2 py-1 text-[10px] font-bold text-cyan-800 transition hover:bg-cyan-100 sm:text-xs',

    timelineEmpty: isDark
      ? 'rounded-2xl border border-dashed border-cyan-400/25 bg-white/5 p-5 text-center text-sm text-slate-400 backdrop-blur-sm'
      : 'rounded-2xl border border-dashed border-cyan-300/50 bg-white/45 p-5 text-center text-sm text-slate-500 backdrop-blur-sm',

    trackLabel: isDark ? 'text-slate-300' : 'text-slate-600',
    trackMeta: isDark ? 'text-slate-500' : 'text-slate-400',
    trackLegend: isDark ? 'text-slate-400' : 'text-slate-500',

    manhoursCard: isDark
      ? 'flex items-center gap-2 rounded-xl border border-cyan-800/40 bg-cyan-950/30 px-2.5 py-2 backdrop-blur-sm'
      : 'flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50/70 px-2.5 py-2 backdrop-blur-sm',
    lossHoursCard: isDark
      ? 'flex items-center gap-2 rounded-xl border border-rose-800/40 bg-rose-950/30 px-2.5 py-2 backdrop-blur-sm'
      : 'flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50/80 px-2.5 py-2 backdrop-blur-sm',

    performanceTile: isDark
      ? 'relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-2xl pmc360-glass-panel-dark'
      : 'relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-2xl pmc360-glass-panel-light',

    dividerGradient: isDark
      ? 'h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent'
      : 'h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent',

    /** Executive shell chrome (project switcher + tab strip + updates) */
    shellHeader: isDark
      ? 'overflow-hidden rounded-xl pmc360-glass-panel-dark text-white'
      : 'overflow-hidden rounded-xl pmc360-glass-panel-light text-slate-900',
    shellTitle: isDark
      ? 'truncate text-base font-bold tracking-tight text-white sm:text-lg'
      : 'truncate text-base font-bold tracking-tight text-[#0e7490] sm:text-lg',
    shellSelect: isDark
      ? 'w-full min-w-0 cursor-pointer appearance-none truncate rounded-lg pmc360-glass-input-dark py-1.5 pl-3 pr-8 text-xs font-semibold text-white outline-none transition hover:border-cyan-400/35 focus:ring-2 focus:ring-cyan-400/25 disabled:cursor-wait disabled:opacity-70 sm:text-sm'
      : 'w-full min-w-0 cursor-pointer appearance-none truncate rounded-lg pmc360-glass-input-light py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-800 outline-none transition hover:border-cyan-400/40 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-wait disabled:opacity-70 sm:text-sm',
    shellSelectChevron: isDark ? 'text-white/60' : 'text-slate-400',
    shellNav: isDark
      ? 'flex gap-1 overflow-x-auto border-t border-cyan-400/15 bg-black/15 px-2 py-1.5 scrollbar-thin sm:px-3'
      : 'flex gap-1 overflow-x-auto border-t border-cyan-200/40 bg-white/35 px-2 py-1.5 scrollbar-thin sm:px-3',
    shellTabActive: isDark
      ? 'bg-cyan-400/20 text-white ring-1 ring-cyan-300/35'
      : 'bg-[#0e7490] text-white shadow-sm',
    shellTabInactive: isDark
      ? 'text-cyan-100/80 hover:bg-white/10 hover:text-white'
      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 ring-1 ring-transparent hover:ring-cyan-200/60',
    shellTabBadgeCritical: isDark
      ? 'bg-rose-500/90 text-white ring-1 ring-white/25'
      : 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
    shellTabBadgeWatch: isDark
      ? 'bg-amber-400 text-[#1a1520] ring-1 ring-white/20'
      : 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    shellBtnSecondary: isDark
      ? 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 sm:text-sm'
      : 'inline-flex items-center justify-center gap-1.5 rounded-lg pmc360-glass-input-light px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white/80 sm:text-sm',
    shellBtnBrief: isDark
      ? 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-300/30 bg-cyan-500/20 px-3 py-2 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-500/30 sm:text-sm'
      : 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-200/70 bg-cyan-50/80 px-3 py-2 text-xs font-semibold text-cyan-800 backdrop-blur-sm transition hover:bg-cyan-100/90 sm:text-sm',
    shellBtnEscalate:
      'inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-400 sm:text-sm',
    shellUpdates: isDark
      ? 'flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg pmc360-glass-dark px-3 py-2'
      : 'flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg pmc360-glass-light px-3 py-2',
    shellUpdatesLabel: isDark
      ? 'text-[10px] font-bold uppercase tracking-wide text-slate-200'
      : 'text-[10px] font-bold uppercase tracking-wide text-cyan-900',
    shellUpdatesCount: isDark
      ? 'ml-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded bg-slate-200 px-1 text-[9px] font-bold text-[#0f2744]'
      : 'ml-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded bg-cyan-800 px-1 text-[9px] font-bold text-white',
    shellUpdatesDivider: isDark ? 'hidden h-3.5 w-px bg-white/15 sm:block' : 'hidden h-3.5 w-px bg-cyan-200/70 sm:block',
    shellUpdatePill: isDark
      ? 'inline-flex max-w-full items-center gap-1.5 rounded-md border border-white/10 bg-white/8 px-2.5 py-1 text-left backdrop-blur-sm transition hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30'
      : 'inline-flex max-w-full items-center gap-1.5 rounded-md border border-cyan-100/70 bg-white/60 px-2.5 py-1 text-left backdrop-blur-sm transition hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/20',
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
