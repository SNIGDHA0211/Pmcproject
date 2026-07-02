import React from 'react';
import { getThemeClasses, useTheme } from '../../utils/theme';

const SitePhotoGallerySkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`overflow-hidden rounded-xl border ${themeClasses.border} ${themeClasses.bgSecondary}`}
        >
          <div className={`aspect-[4/3] animate-pulse ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'}`} />
          <div className="space-y-1.5 p-2.5">
            <div className={`h-2.5 w-2/3 animate-pulse rounded ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'}`} />
            <div className={`h-2.5 w-1/2 animate-pulse rounded ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'}`} />
            <div className={`h-6 w-full animate-pulse rounded-md ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SitePhotoGallerySkeleton;
