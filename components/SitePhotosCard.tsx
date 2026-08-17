import React, { useEffect, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import DashboardCardTopAccent from './DashboardCardTopAccent';
import { Icons } from './Icons';
import SitePhotoLightbox from './sitePhotos/SitePhotoLightbox';
import { useSiteImages } from '../hooks/useSiteImages';
import type { SiteImageRecord } from '../types';
import { DASHBOARD_CARD_TITLE_CLASS, getThemeClasses, useTheme } from '../utils/theme';
import { getSiteImageDisplayTitle } from '../utils/siteImages';

const MAX_ROW_PREVIEW = 6;
const LOADING_PLACEHOLDERS = 6;

/** Responsive thumbnail grid — one cell per image, no full-width stretch for a single photo. */
const PREVIEW_GRID_CLASS =
  'grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6';
const PREVIEW_GRID_EMBEDDED_CLASS =
  'grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5';

type SitePhotosCardProps = {
  className?: string;
  projectName?: string;
  month?: number;
  year?: number;
  onViewAll?: () => void;
  /** Flat layout when nested inside PMC Head executive panel */
  embedded?: boolean;
};

export const SitePhotosCard: React.FC<SitePhotosCardProps> = ({
  className = '',
  projectName,
  month: monthProp,
  year: yearProp,
  onViewAll,
  embedded = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const now = new Date();
  const month = monthProp ?? now.getMonth() + 1;
  const year = yearProp ?? now.getFullYear();

  const { images, isLoading, error, refresh } = useSiteImages(projectName, month, year);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setLightboxIndex(0);
  }, [projectName, month, year, images.length]);

  const countLabel = projectName ? ` (${images.length})` : '';
  const previewImages = images.slice(0, MAX_ROW_PREVIEW);
  const remainingCount = Math.max(0, images.length - MAX_ROW_PREVIEW);
  const previewGridClass = embedded ? PREVIEW_GRID_EMBEDDED_CLASS : PREVIEW_GRID_CLASS;

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const renderPreviewImage = (image: SiteImageRecord, index: number, showMoreOverlay = false) => {
    const displayTitle = getSiteImageDisplayTitle(image.title);
    return (
    <button
      key={image.id}
      type="button"
      onClick={() => (showMoreOverlay && onViewAll ? onViewAll() : openLightbox(index))}
      className={`group relative aspect-[4/3] w-full overflow-hidden rounded-lg border text-left transition-shadow duration-300 hover:shadow-md ${
        isDarkTheme
          ? 'border-white/10 bg-slate-900/40 hover:ring-1 hover:ring-white/15'
          : 'border-slate-200 bg-slate-100 hover:ring-1 hover:ring-slate-300/80'
      }`}
    >
      <img
        src={image.thumbnailUrl || image.imageUrl}
        alt={displayTitle}
        loading="lazy"
        decoding="async"
        className="block h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
      />
      {showMoreOverlay ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 backdrop-blur-[1px]">
          <span className="text-lg font-black tabular-nums text-white">+{remainingCount}</span>
          <span className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-white/90">View all</span>
        </span>
      ) : (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-5">
          <span className="line-clamp-1 text-[9px] font-bold text-white" title={image.title || undefined}>
            {displayTitle}
          </span>
        </span>
      )}
    </button>
    );
  };

  return (
    <>
      <div
        className={`site-photos-card joyride-target-stable relative flex w-full min-w-0 flex-col overflow-hidden ${
          embedded
            ? `p-3 sm:p-4 ${className}`
            : `rounded-2xl border p-4 ${themeClasses.glassCard} ${themeClasses.border} shadow-sm ${className}`
        }`}
      >
        {!embedded && <DashboardCardTopAccent />}
        <div
          className={`flex shrink-0 items-center justify-between gap-2 ${
            embedded ? 'mb-3' : `mb-3 border-b pb-3 pt-0.5 ${themeClasses.border}`
          }`}
        >
          {!embedded && (
            <h3 className={DASHBOARD_CARD_TITLE_CLASS}>
              Site Photos{countLabel}
            </h3>
          )}
          {embedded && (
            <p className="text-xs font-semibold text-slate-500 sm:text-sm">
              {images.length} photo{images.length !== 1 ? 's' : ''} this period
            </p>
          )}
          <div className={`flex items-center gap-1.5 ${embedded ? 'ml-auto' : ''}`}>
            {onViewAll && (
              <button
                type="button"
                onClick={onViewAll}
                className={`rounded-lg border p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600 ${themeClasses.border} dark:hover:bg-white/10`}
                title="Add site photos"
                aria-label="Add site photos"
              >
                <Icons.Add size={14} />
              </button>
            )}
            {images.length > 0 && (
              <button
                type="button"
                onClick={() => openLightbox(0)}
                className={`rounded-lg border p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600 ${themeClasses.border} dark:hover:bg-white/10`}
                title="View full screen"
                aria-label="View site photos full screen"
              >
                <Icons.FullScreen size={14} />
              </button>
            )}
            {onViewAll && (
              <button
                type="button"
                onClick={onViewAll}
                className={`rounded-lg border px-2 py-1.5 text-[8px] font-black uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-600 ${themeClasses.border}`}
              >
                View All
              </button>
            )}
          </div>
        </div>

        <div className="min-w-0">
          {!projectName ? (
            <div
              className={`flex flex-col items-center justify-center rounded-lg border border-dashed px-3 py-8 text-center ${themeClasses.border}`}
            >
              <p className={`text-[10px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>
                Select a project
              </p>
            </div>
          ) : isLoading ? (
            <div className={previewGridClass}>
              {Array.from({ length: LOADING_PLACEHOLDERS }).map((_, i) => (
                <div
                  key={i}
                  className={`aspect-[4/3] w-full animate-pulse rounded-lg ${themeClasses.bgSecondary}`}
                />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-2 px-2 py-8 text-center">
              <p className="text-[10px] font-bold text-rose-500">{error}</p>
              <button type="button" onClick={refresh} className="text-[9px] font-black uppercase text-blue-600">
                Retry
              </button>
            </div>
          ) : images.length === 0 ? (
            <div
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-8 text-center ${themeClasses.border}`}
            >
              <ImageIcon size={22} className={themeClasses.textMuted} />
              <p className={`text-[9px] font-bold uppercase leading-snug tracking-wide ${themeClasses.textMuted}`}>
                No images uploaded for selected month.
              </p>
            </div>
          ) : (
            <div className={previewGridClass}>
              {previewImages.map((image, index) =>
                renderPreviewImage(
                  image,
                  index,
                  remainingCount > 0 && index === previewImages.length - 1,
                ),
              )}
            </div>
          )}
        </div>

        {remainingCount > 0 && (
          <p className={`mt-2 shrink-0 text-center text-[9px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>
            Showing {previewImages.length} of {images.length} · View all for full gallery
          </p>
        )}
      </div>

      {lightboxOpen && images.length > 0 && (
        <SitePhotoLightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </>
  );
};
