import { createContext, useContext, type ReactNode } from 'react';

export const THEME_STORAGE_KEY = 'theme';

/** First-time visitors (no saved preference) always start on dark. */
export function readStoredIsDarkTheme(): boolean {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light') return false;
    if (saved === 'dark') return true;
  } catch {
    /* ignore */
  }
  return true;
}

export function persistThemePreference(isDark: boolean): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  } catch {
    /* ignore */
  }
}

export function applyDocumentTheme(isDark: boolean): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.dataset.theme = isDark ? 'dark' : 'light';
  html.style.backgroundColor = isDark ? '#0a1420' : '#e8f4fb';
  html.style.colorScheme = isDark ? 'dark' : 'light';
  html.classList.toggle('dark', isDark);
}

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

// Theme utility functions — enterprise dashboard (light & dark mode supported)
export const getThemeClasses = (isDark: boolean) => ({
  glassCard: isDark
    ? 'bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg text-slate-100 backdrop-blur-sm'
    : 'bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-900',
  textPrimary: isDark ? 'text-slate-100' : 'text-slate-900',
  textSecondary: isDark ? 'text-slate-300' : 'text-slate-600',
  textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
  textInverse: isDark ? 'text-slate-900' : 'text-white',
  bgPrimary: isDark ? 'bg-[#0b1329]' : 'bg-white',
  bgSecondary: isDark ? 'bg-slate-900' : 'bg-slate-50',
  bgHover: isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-50',
  border: isDark ? 'border-slate-800' : 'border-slate-200',
  input: isDark
    ? 'bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 shadow-sm'
    : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/18 shadow-sm',
  buttonSecondary: isDark
    ? 'text-slate-200 hover:bg-slate-800 hover:text-white'
    : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600',
  buttonPrimary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm',
  accent: isDark ? 'text-blue-400' : 'text-blue-600',
  warning: isDark ? 'text-amber-400' : 'text-amber-600',
  danger: isDark ? 'text-rose-400' : 'text-rose-600',
  success: isDark ? 'text-emerald-400' : 'text-emerald-600',
  placeholder: isDark ? 'placeholder-slate-500' : 'placeholder-slate-400',
});

/** Primary title on dashboard summary / KPI cards */
export const DASHBOARD_CARD_TITLE_CLASS =
  'pmc-type-card-title truncate text-blue-600 dark:text-blue-400';

/** Correspondence card title — same scale, tighter professional tracking */
export const DASHBOARD_CORRESPONDENCE_TITLE_CLASS =
  'pmc-type-card-title truncate text-blue-600 dark:text-blue-400';

/** Internal padding for correspondence dashboard card */
export const DASHBOARD_CORRESPONDENCE_CARD_PADDING = 'px-3 py-4 sm:px-5 sm:py-[18px]';

/** Group card titles (contract values, invoicing, planned vs earned) */
export const DASHBOARD_GROUP_CARD_TITLE_CLASS = (isDark?: boolean) =>
  `pmc-type-card-title truncate ${isDark ? 'text-blue-400' : 'text-blue-600'}`;

/** In-card section titles (FullScreenCard bodies, analytics charts) */
export const DASHBOARD_SECTION_TITLE_CLASS = (isDark?: boolean) =>
  `pmc-type-card-title truncate ${isDark ? 'text-slate-100' : 'text-[#1e3a5f]'}`;

/** Financial group card titles */
export const DASHBOARD_FINANCIAL_GROUP_TITLE_CLASS =
  'pmc-type-card-title truncate text-blue-600 dark:text-blue-400';

/** Tertiary subtitle under financial group titles */
export const DASHBOARD_FINANCIAL_GROUP_SUBTITLE_CLASS = (isDark: boolean) =>
  `pmc-type-caption mt-0.5 line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`;

/** KPI metric labels on financial tiles */
export const DASHBOARD_FINANCIAL_KPI_LABEL_CLASS =
  'pmc-type-eyebrow min-w-0 leading-snug line-clamp-2';

/** Internal padding for financial group cards */
export const DASHBOARD_FINANCIAL_CARD_PADDING = 'px-5 py-[18px]';

/** Status card titles (HSE, Quality, Drawings) */
export const DASHBOARD_STATUS_CARD_TITLE_CLASS =
  'pmc-type-card-title truncate text-blue-600 dark:text-blue-400';

/** Internal padding for status / analytics dashboard cards */
export const DASHBOARD_STATUS_CARD_PADDING = 'px-5 py-[18px]';

/** Metric tile labels on quality, drawing, and similar KPI grids */
export const DASHBOARD_METRIC_KPI_LABEL_CLASS =
  'pmc-type-eyebrow min-w-0 leading-snug line-clamp-2';

/** Labels on HSE / Quality / Drawings metric KPI cards */
export const DASHBOARD_STATUS_METRIC_LABEL_CLASS = (isDark: boolean) =>
  isDark ? 'text-slate-300' : 'text-[#475569]';

/** Secondary supporting metric values (percentages, ratios) */
export const DASHBOARD_METRIC_SECONDARY_VALUE_CLASS = (isDark: boolean) =>
  isDark ? 'text-slate-400' : 'text-[#64748B]';

/** Client / Contractor party titles within correspondence dashboards */
export const DASHBOARD_CORRESPONDENCE_PARTY_TITLE_CLASS =
  'pmc-type-card-title text-blue-600 dark:text-blue-400';

/** Correspondence documents table column headers — improved contrast */
export const DASHBOARD_CORRESPONDENCE_TABLE_HEADER_CLASS = (isDark: boolean) =>
  isDark ? 'text-slate-400' : 'text-[#475569]';

/** Standard dashboard card header row — spacing only; preserves card min-heights */
export const DASHBOARD_CARD_HEADER_ROW_CLASS = (borderClass: string) =>
  `flex shrink-0 items-center justify-between gap-3 border-b pb-3 pt-0.5 ${borderClass}`;

/** Neutral tone for informational KPI values where status color is not required */
export const DASHBOARD_NEUTRAL_VALUE_CLASS = (isDark: boolean) =>
  isDark ? 'text-slate-100' : 'text-[#1E293B]';