import type { getThemeClasses } from './theme';

type ThemeClasses = ReturnType<typeof getThemeClasses>;

export function getBillingTheme(isDarkTheme: boolean, themeClasses: ThemeClasses) {
  return {
    card: `rounded-2xl border p-4 sm:p-5 ${isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-slate-200 bg-white shadow-sm'
      }`,
    innerCard: `rounded-xl border p-3 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'
      }`,
    metricTile: `rounded-xl border px-3 py-2.5 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'
      }`,
    sectionIcon: `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isDarkTheme ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
      }`,
    sectionTitle: `text-xs font-black uppercase tracking-widest sm:text-sm ${themeClasses.textPrimary}`,
    sectionSubtitle: `text-[11px] font-semibold ${themeClasses.textSecondary}`,
    label: `text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`,
    metricLabel: `text-[9px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`,
    btnPrimary:
      'inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white transition-colors hover:bg-indigo-500 disabled:opacity-60',
    btnSave:
      'rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60',
    btnPrimarySm:
      'inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-black uppercase text-white transition-colors hover:bg-indigo-500',
    btnGhost:
      'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase transition-colors',
    btnSecondary: `rounded-xl border px-4 py-2 text-xs font-bold ${themeClasses.buttonSecondary} ${themeClasses.border}`,
    tabList: `flex flex-wrap gap-1 rounded-xl p-1 ${isDarkTheme ? 'bg-white/5' : 'bg-slate-100'}`,
    tabActive: 'flex h-10 shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-sm sm:text-sm',
    tabInactive: `flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-bold transition-colors sm:text-sm ${isDarkTheme ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-white hover:text-slate-900'
      }`,
    select: `rounded-xl border px-2.5 py-1.5 text-xs font-bold outline-none ${isDarkTheme
        ? `${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`
        : 'border-slate-200 bg-white text-slate-900'
      }`,
    spinner: 'h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent',
    spinnerSm: 'h-9 w-9 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent',
    divider: `border-t ${isDarkTheme ? 'border-white/10' : 'border-slate-100'}`,
    successBanner:
      'rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-300',
    emptyState: `rounded-xl border border-dashed py-10 text-center text-sm ${isDarkTheme ? 'border-white/15 text-slate-400' : 'border-slate-200 text-slate-500'
      }`,
    progressTrack: `h-2.5 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-100'}`,
    progressFill: 'h-full rounded-full bg-indigo-600',
    pageShell: `space-y-5 sm:space-y-6`,
    chartTooltip: {
      backgroundColor: isDarkTheme ? '#1e293b' : '#fff',
      border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
      borderRadius: 12,
      fontSize: 12,
    },
    kpiIcon: isDarkTheme ? 'text-indigo-300 bg-indigo-500/15' : 'text-indigo-600 bg-indigo-50',
  } as const;
}

export type BillingTheme = ReturnType<typeof getBillingTheme>;
