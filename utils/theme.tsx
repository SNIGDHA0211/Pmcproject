import { createContext, useContext, type ReactNode } from 'react';

// Theme Context
interface ThemeContextType {
  isDarkTheme: boolean;
  setIsDarkTheme: (isDark: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

/** When true, nested content always renders with light-theme tokens (readable on white surfaces). */
export const ContentLightSurfaceContext = createContext(false);

export const ContentLightSurfaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ContentLightSurfaceContext.Provider value={true}>{children}</ContentLightSurfaceContext.Provider>
);

/** Respects ContentLightSurfaceContext — use inside self-contained light panels on a dark shell. */
export const useEffectiveTheme = () => {
  const forceLight = useContext(ContentLightSurfaceContext);
  const { isDarkTheme } = useTheme();
  const isDarkThemeEffective = forceLight ? false : isDarkTheme;
  return {
    isDarkTheme: isDarkThemeEffective,
    isDarkShell: isDarkTheme,
    themeClasses: getThemeClasses(isDarkThemeEffective),
  };
};

// Theme utility functions — palette from night construction site (navy + amber glow)
export const getThemeClasses = (isDark: boolean) => ({
  glassCard: isDark ? 'glass-card' : 'glass-card-light',
  textPrimary: isDark ? 'text-contrast' : 'text-[#1a2332]',
  textSecondary: isDark ? 'muted' : 'text-[#4a5563]',
  textMuted: isDark ? 'text-white/55' : 'text-[#6b7280]',
  textInverse: isDark ? 'text-[#1a2332]' : 'text-white',
  bgPrimary: isDark ? 'bg-[#121a24]' : 'bg-white',
  bgSecondary: isDark ? 'bg-white/5' : 'bg-[#eef6fb]',
  bgHover: isDark ? 'hover:bg-white/10' : 'hover:bg-[#e0f0fa]',
  border: isDark ? 'border-white/12' : 'border-[#b8cfe0]',
  input: isDark
    ? 'glass-input'
    : 'bg-white border border-[#b8cfe0] focus:border-amber-500 shadow-sm',
  buttonSecondary: isDark
    ? 'text-white/75 hover:bg-white/10'
    : 'text-[#334155] hover:bg-[#e0f0fa]',
  buttonPrimary: isDark
    ? 'bg-gradient-to-r from-[#e68a00] to-[#f59e0b] hover:from-[#d97706] hover:to-[#e68a00] text-white'
    : 'bg-gradient-to-r from-[#1e3a5f] to-[#2563a8] hover:from-[#16304f] hover:to-[#1e88e5] text-white',
  accent: isDark ? 'text-amber-300' : 'text-[#c2410c]',
  warning: isDark ? 'text-amber-400' : 'text-amber-600',
  danger: isDark ? 'text-rose-400' : 'text-rose-600',
  success: isDark ? 'text-emerald-400' : 'text-emerald-600',
  placeholder: isDark ? 'placeholder-white/40' : 'placeholder-slate-500',
});

/** Primary title on dashboard summary / KPI cards (Project Dates style) */
export const DASHBOARD_CARD_TITLE_CLASS =
  'truncate text-lg font-black uppercase leading-tight tracking-wide text-[#1e3a5f] sm:text-xl';

/** Correspondence card title — same scale, tighter professional tracking */
export const DASHBOARD_CORRESPONDENCE_TITLE_CLASS =
  'truncate text-base font-black uppercase leading-tight tracking-wide text-blue-600 sm:text-lg md:text-xl';

/** Internal padding for correspondence dashboard card */
export const DASHBOARD_CORRESPONDENCE_CARD_PADDING = 'px-3 py-4 sm:px-5 sm:py-[18px]';

/** Group card titles (contract values, invoicing, planned vs earned) */
export const DASHBOARD_GROUP_CARD_TITLE_CLASS = (_isDark?: boolean) => DASHBOARD_CARD_TITLE_CLASS;

/** In-card section titles (FullScreenCard bodies, analytics charts) */
export const DASHBOARD_SECTION_TITLE_CLASS = (_isDark?: boolean) => DASHBOARD_CARD_TITLE_CLASS;

/** Financial group card titles — 22px tablet, 24px desktop */
export const DASHBOARD_FINANCIAL_GROUP_TITLE_CLASS =
  'truncate text-[22px] font-black uppercase leading-tight tracking-wide text-blue-600 sm:text-2xl';

/** Tertiary subtitle under financial group titles — 12px */
export const DASHBOARD_FINANCIAL_GROUP_SUBTITLE_CLASS = (isDark: boolean) =>
  `mt-0.5 text-xs font-medium uppercase tracking-wide line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`;

/** KPI metric labels on financial tiles — 13px mobile, 14px desktop */
export const DASHBOARD_FINANCIAL_KPI_LABEL_CLASS =
  'min-w-0 text-[13px] sm:text-sm font-semibold uppercase tracking-wide leading-snug line-clamp-2';

/** Internal padding for financial group cards */
export const DASHBOARD_FINANCIAL_CARD_PADDING = 'px-5 py-[18px]';

/** Status card titles (HSE, Quality, Drawings) — slightly smaller, tighter tracking */
export const DASHBOARD_STATUS_CARD_TITLE_CLASS =
  'truncate text-base font-black uppercase leading-tight tracking-wide text-blue-600 sm:text-lg';

/** Internal padding for status / analytics dashboard cards */
export const DASHBOARD_STATUS_CARD_PADDING = 'px-5 py-[18px]';

/** Metric tile labels on quality, drawing, and similar KPI grids */
export const DASHBOARD_METRIC_KPI_LABEL_CLASS =
  'min-w-0 text-[13px] font-semibold uppercase tracking-wide leading-snug line-clamp-2';

/** Labels on HSE / Quality / Drawings metric KPI cards */
export const DASHBOARD_STATUS_METRIC_LABEL_CLASS = (isDark: boolean) =>
  isDark ? 'text-slate-400' : 'text-[#475569]';

/** Secondary supporting metric values (percentages, ratios) */
export const DASHBOARD_METRIC_SECONDARY_VALUE_CLASS = (isDark: boolean) =>
  isDark ? 'text-slate-400' : 'text-[#64748B]';

/** Client / Contractor party titles within correspondence dashboards */
export const DASHBOARD_CORRESPONDENCE_PARTY_TITLE_CLASS =
  'text-sm font-semibold uppercase tracking-wide text-blue-600';

/** Correspondence documents table column headers — improved contrast */
export const DASHBOARD_CORRESPONDENCE_TABLE_HEADER_CLASS = (isDark: boolean) =>
  isDark ? 'text-slate-400' : 'text-[#475569]';

/** Standard dashboard card header row — spacing only; preserves card min-heights */
export const DASHBOARD_CARD_HEADER_ROW_CLASS = (borderClass: string) =>
  `flex shrink-0 items-center justify-between gap-3 border-b pb-3 pt-0.5 ${borderClass}`;

/** Neutral tone for informational KPI values where status color is not required */
export const DASHBOARD_NEUTRAL_VALUE_CLASS = (isDark: boolean) =>
  isDark ? 'text-slate-200' : 'text-[#1E293B]';