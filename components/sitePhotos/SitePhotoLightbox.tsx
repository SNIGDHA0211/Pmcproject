import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Download, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import type { SiteImageRecord } from '../../types';
import { Icons } from '../Icons';
import { downloadSiteImage, formatSiteImageUploadDate } from '../../utils/siteImages';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface SitePhotoLightboxProps {
  images: SiteImageRecord[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onDelete?: (image: SiteImageRecord) => void;
}

const ZOOM_LEVELS = [1, 1.5, 2] as const;

const SitePhotoLightbox: React.FC<SitePhotoLightboxProps> = ({
  images,
  index,
  onClose,
  onIndexChange,
  onDelete,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [zoomIndex, setZoomIndex] = useState(0);

  const current = images[index];
  const scale = ZOOM_LEVELS[zoomIndex];

  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + images.length) % images.length);
    setZoomIndex(0);
  }, [images.length, index, onIndexChange]);

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % images.length);
    setZoomIndex(0);
  }, [images.length, index, onIndexChange]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === '+' || e.key === '=') setZoomIndex((z) => Math.min(z + 1, ZOOM_LEVELS.length - 1));
      else if (e.key === '-') setZoomIndex((z) => Math.max(z - 1, 0));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev, onClose]);

  if (!current || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Site photo lightbox"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <header
        className={`flex shrink-0 items-center justify-between border-b px-4 py-3 ${themeClasses.border} bg-black/40`}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-sm font-black uppercase tracking-widest text-white">Site Photos</p>
          <p className="text-[10px] font-medium text-white/70">
            {index + 1} / {images.length} · {formatSiteImageUploadDate(current.uploadedAt)}
            {current.uploadedBy ? ` · ${current.uploadedBy}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadSiteImage(current.imageUrl, current.id)}
            className="rounded-lg p-2 text-white hover:bg-white/10"
            title="Download photo"
            aria-label="Download photo"
          >
            <Download size={18} />
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(current)}
              className="rounded-lg p-2 text-rose-300 hover:bg-rose-500/20"
              title="Delete photo"
              aria-label="Delete photo"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setZoomIndex((z) => Math.max(z - 1, 0))}
            disabled={zoomIndex === 0}
            className="rounded-lg p-2 text-white hover:bg-white/10 disabled:opacity-40"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut size={18} />
          </button>
          <span className="min-w-[3rem] text-center text-xs font-bold tabular-nums text-white">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoomIndex((z) => Math.min(z + 1, ZOOM_LEVELS.length - 1))}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            className="rounded-lg p-2 text-white hover:bg-white/10 disabled:opacity-40"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn size={18} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white hover:bg-white/10"
            aria-label="Close lightbox"
          >
            <Icons.Close size={20} />
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={goPrev}
          className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 sm:left-6"
          aria-label="Previous photo"
        >
          <ChevronLeft size={26} />
        </button>

        <img
          key={current.id}
          src={current.imageUrl}
          alt={`Site photo ${index + 1}`}
          className="max-h-full max-w-full rounded-lg object-contain transition-transform duration-200"
          style={{ transform: `scale(${scale})` }}
        />

        <button
          type="button"
          onClick={goNext}
          className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 sm:right-6"
          aria-label="Next photo"
        >
          <ChevronRight size={26} />
        </button>
      </div>
    </div>,
    document.body
  );
};

export default SitePhotoLightbox;
