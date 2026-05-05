import { createContext, useContext } from 'react';

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

// Theme utility functions
export const getThemeClasses = (isDark: boolean) => ({
  glassCard: isDark ? 'glass-card' : 'glass-card-light',
  textPrimary: isDark ? 'text-contrast' : 'text-slate-900',
  textSecondary: isDark ? 'muted' : 'text-slate-600',
  textMuted: isDark ? 'text-white/60' : 'text-slate-500',
  textInverse: isDark ? 'text-gray-900' : 'text-white',
  bgPrimary: isDark ? 'bg-[#0b1d36]' : 'bg-white',
  bgSecondary: isDark ? 'bg-white/5' : 'bg-slate-50',
  bgHover: isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100',
  border: isDark ? 'border-white/10' : 'border-slate-300',
  input: isDark ? 'glass-input' : 'bg-white border border-slate-300 focus:border-indigo-500 shadow-sm',
  buttonSecondary: isDark ? 'text-white/70 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100',
  accent: isDark ? 'text-blue-400' : 'text-blue-600',
  warning: isDark ? 'text-amber-400' : 'text-amber-600',
  danger: isDark ? 'text-rose-400' : 'text-rose-600',
  success: isDark ? 'text-emerald-400' : 'text-emerald-600',
  placeholder: isDark ? 'placeholder-white/40' : 'placeholder-slate-500',
});