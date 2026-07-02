import React from 'react';
import { getThemeClasses, useTheme } from '../../utils/theme';

const FinancialManagementSkeleton: React.FC = () => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const pulse = isDarkTheme ? 'bg-white/10' : 'bg-slate-200';

  return (
    <div className="relative space-y-6 financial-management-skeleton" aria-hidden="true">
      <div className={`rounded-3xl border p-6 ${themeClasses.glassCard} ${themeClasses.border}`}>
        <div className={`mb-4 h-4 w-48 animate-pulse rounded ${pulse}`} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className={`h-3 w-24 animate-pulse rounded ${pulse}`} />
              <div className={`h-10 w-full animate-pulse rounded-2xl ${pulse}`} />
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <div className={`h-10 w-32 animate-pulse rounded-2xl ${pulse}`} />
          <div className={`h-10 w-28 animate-pulse rounded-2xl ${pulse}`} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`h-64 animate-pulse rounded-3xl border ${themeClasses.border} ${pulse}`} />
        <div className={`h-64 animate-pulse rounded-3xl border ${themeClasses.border} ${pulse}`} />
      </div>
    </div>
  );
};

export default FinancialManagementSkeleton;
