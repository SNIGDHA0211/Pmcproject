import { useTheme } from './theme';

/** Shared MPR Review styling — matches PMC executive / app shell palette. */
export function getMprTheme(isDark: boolean) {
  return {
    isDark,

    page: 'mx-auto max-w-6xl space-y-5 pb-8 animate-in fade-in duration-300',

    card: isDark
      ? 'rounded-2xl border border-white/12 bg-[#121a24]/95 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm'
      : 'rounded-2xl border border-slate-200/90 bg-white text-slate-900 shadow-[0_6px_18px_rgba(15,23,42,0.06)]',

    cardMuted: isDark
      ? 'rounded-2xl border border-white/10 bg-white/[0.03]'
      : 'rounded-2xl border border-slate-200 bg-slate-50/80',

    eyebrow: isDark
      ? 'text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300'
      : 'text-[10px] font-black uppercase tracking-[0.2em] text-[#1e3a5f]',

    title: isDark
      ? 'text-2xl font-black tracking-tight text-white'
      : 'text-2xl font-black tracking-tight text-slate-900',

    subtitle: isDark
      ? 'text-sm font-medium leading-relaxed text-slate-400'
      : 'text-sm font-medium leading-relaxed text-slate-600',

    label: isDark
      ? 'text-[10px] font-black uppercase tracking-wide text-slate-400'
      : 'text-[10px] font-black uppercase tracking-wide text-slate-500',

    input: isDark
      ? 'w-full rounded-xl border border-cyan-300/35 bg-[#0b1522] py-2.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] outline-none transition hover:border-cyan-300/55 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/30 disabled:opacity-60'
      : 'w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition hover:border-slate-400 focus:border-[#2563a8] focus:ring-2 focus:ring-[#2563a8]/25 disabled:opacity-60',

    selectOption: isDark ? 'bg-[#0b1522] text-white' : 'bg-white text-slate-900',

    btnPrimary: isDark
      ? 'inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#e68a00] to-[#f59e0b] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:from-[#d97706] hover:to-[#e68a00] disabled:cursor-not-allowed disabled:opacity-50'
      : 'inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1e3a5f] to-[#2563a8] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:from-[#16304f] hover:to-[#1e88e5] disabled:cursor-not-allowed disabled:opacity-50',

    btnSecondary: isDark
      ? 'inline-flex items-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-2.5 text-xs font-black text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50'
      : 'inline-flex items-center gap-2 rounded-xl border border-[#2563a8]/30 bg-[#eef6fb] px-4 py-2.5 text-xs font-black text-[#1e3a5f] transition hover:bg-[#e0f0fa] disabled:cursor-not-allowed disabled:opacity-50',

    btnGhost: isDark
      ? 'inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-50'
      : 'inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50',

    btnDownloadPrimary: isDark
      ? 'inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-900 shadow-sm hover:bg-slate-100 disabled:opacity-50'
      : 'inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-[#16304f] disabled:opacity-50',

    btnDownloadSecondary: isDark
      ? 'inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-xs font-black text-white transition hover:bg-white/10 disabled:opacity-50'
      : 'inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50',

    workflowStep: isDark
      ? 'flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2'
      : 'flex items-center gap-2 rounded-xl border border-slate-200 bg-[#eef6fb]/80 px-3 py-2',

    workflowBadge: isDark
      ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-[10px] font-black text-white shadow-sm'
      : 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2563a8] text-[10px] font-black text-white shadow-sm',

    contextPill: isDark
      ? 'rounded-lg bg-white/10 px-2 py-1 font-semibold text-slate-200'
      : 'rounded-lg bg-slate-100 px-2 py-1 font-semibold text-slate-700',

    userBadge: isDark
      ? 'shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right text-xs'
      : 'shrink-0 rounded-xl border border-slate-200 bg-[#eef6fb] px-3 py-2 text-right text-xs',

    divider: isDark ? 'border-white/10' : 'border-slate-100',

    tabActive: isDark
      ? 'flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500/25 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white ring-1 ring-cyan-400/35 shadow-sm'
      : 'flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-sm',

    tabInactive: isDark
      ? 'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-300 transition hover:bg-white/10'
      : 'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-600 transition hover:bg-slate-100',

    tabBadgeActive: 'rounded-full bg-white/20 px-1.5 py-0.5 text-[9px]',

    tabBadgeInactive: isDark
      ? 'rounded-full bg-cyan-500/15 px-1.5 py-0.5 text-[9px] text-cyan-200'
      : 'rounded-full bg-[#eef6fb] px-1.5 py-0.5 text-[9px] text-[#1e3a5f]',

    statusOk: isDark
      ? 'inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-1 font-bold text-emerald-300'
      : 'inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 font-bold text-emerald-700 ring-1 ring-emerald-200',

    bannerGenerating: isDark
      ? 'flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3'
      : 'flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3',

    bannerError: isDark
      ? 'flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3'
      : 'flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3',

    bannerSuccess: isDark
      ? 'flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3'
      : 'flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3',

    emptyState: isDark
      ? 'flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center'
      : 'flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-[#eef6fb]/50 p-8 text-center',

    tableWrap: isDark
      ? 'overflow-hidden rounded-2xl border border-white/12 bg-[#121a24]/95'
      : 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm',

    tableHead: isDark
      ? 'border-b border-white/10 bg-white/5 px-4 py-3'
      : 'border-b border-slate-100 bg-[#eef6fb] px-4 py-3',

    accordion: isDark
      ? 'overflow-hidden rounded-2xl border border-white/12 bg-[#121a24]/95'
      : 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm',

    kvCell: isDark
      ? 'rounded-xl border border-white/10 bg-white/[0.02] p-3'
      : 'rounded-xl border border-slate-100 bg-[#eef6fb]/60 p-3',
  };
}

export type MprTheme = ReturnType<typeof getMprTheme>;

export function useMprTheme(): MprTheme {
  const { isDarkTheme } = useTheme();
  return getMprTheme(isDarkTheme);
}
