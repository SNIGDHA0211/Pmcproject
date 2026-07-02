import React from 'react';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface FinancialManagementLoadingOverlayProps {
  message?: string;
}

const FinancialManagementLoadingOverlay: React.FC<FinancialManagementLoadingOverlayProps> = ({
  message = 'Loading financial data…',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <div
      className={`financial-loading-overlay loading spinner absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl backdrop-blur-[2px] ${
        isDarkTheme ? 'bg-slate-950/70' : 'bg-white/75'
      }`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={`h-11 w-11 animate-spin rounded-full border-[3px] border-t-transparent ${
          isDarkTheme ? 'border-white/30 border-t-white' : 'border-indigo-200 border-t-indigo-600'
        }`}
      />
      <p
        className={`mt-4 text-center text-[10px] font-black uppercase tracking-[0.2em] ${
          isDarkTheme ? 'text-slate-200' : themeClasses.textSecondary
        }`}
      >
        {message}
      </p>
    </div>
  );
};

export default FinancialManagementLoadingOverlay;
