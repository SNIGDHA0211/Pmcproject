import React from 'react';
import { getThemeClasses, useTheme } from '../../utils/theme';

export interface SitePhotoGallerySummaryProps {
  totalPhotos: number;
  latestUploadDate: string;
  projectName: string;
  monthLabel: string;
}

const SitePhotoGallerySummary: React.FC<SitePhotoGallerySummaryProps> = ({
  totalPhotos,
  latestUploadDate,
  projectName,
  monthLabel,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const chips = [
    { label: 'Total Photos', value: String(totalPhotos) },
    { label: 'Latest Upload', value: latestUploadDate },
    { label: 'Project', value: projectName || '—' },
    { label: 'Period', value: monthLabel || '—' },
  ];

  return (
    <div className="site-photo-gallery-summary flex flex-wrap gap-2">
      {chips.map((chip) => (
        <div
          key={chip.label}
          className={`inline-flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 ${
            isDarkTheme ? `${themeClasses.border} bg-white/[0.04]` : 'border-[#E2E8F0] bg-[#F8FAFC]'
          }`}
        >
          <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${themeClasses.textMuted}`}>
            {chip.label}
          </span>
          <span className={`truncate text-xs font-bold tabular-nums ${themeClasses.textPrimary}`}>
            {chip.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default SitePhotoGallerySummary;
