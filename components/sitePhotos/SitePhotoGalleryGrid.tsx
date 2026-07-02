import React from 'react';
import { Download, Maximize2, Trash2 } from 'lucide-react';
import type { SiteImageRecord } from '../../types';
import { downloadSiteImage, formatSiteImageUploadDate } from '../../utils/siteImages';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface SitePhotoGalleryGridProps {
  images: SiteImageRecord[];
  onOpen: (index: number) => void;
  onDelete: (image: SiteImageRecord) => void;
}

const SitePhotoGalleryGrid: React.FC<SitePhotoGalleryGridProps> = ({ images, onOpen, onDelete }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <div className="site-photo-gallery-grid grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
      {images.map((image, index) => (
        <article
          key={image.id}
          className={`group overflow-hidden rounded-xl border transition-shadow hover:shadow-md ${themeClasses.glassCard} ${themeClasses.border}`}
        >
          <div className="relative">
            <button
              type="button"
              onClick={() => onOpen(index)}
              className="relative block w-full overflow-hidden text-left"
              aria-label="View photo fullscreen"
            >
              <img
                src={image.thumbnailUrl || image.imageUrl}
                alt={`Site photo uploaded ${formatSiteImageUploadDate(image.uploadedAt)}`}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </button>
            <div className="absolute right-2 top-2 flex gap-1">
              <button
                type="button"
                onClick={() => onOpen(index)}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75"
                title="View fullscreen"
                aria-label="View fullscreen"
              >
                <Maximize2 size={13} />
              </button>
              <button
                type="button"
                onClick={() => downloadSiteImage(image.imageUrl, image.id)}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75"
                title="Download photo"
                aria-label="Download photo"
              >
                <Download size={13} />
              </button>
            </div>
          </div>

          <footer className={`border-t px-2.5 py-2 ${themeClasses.border}`}>
            <div className="grid grid-cols-1 gap-1 text-[10px] leading-snug">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`font-semibold uppercase tracking-wide ${themeClasses.textMuted}`}>Upload Date</p>
                  <p className={`font-bold ${themeClasses.textPrimary}`}>
                    {formatSiteImageUploadDate(image.uploadedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(image)}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-rose-500 transition-colors hover:bg-rose-500/10 ${themeClasses.border}`}
                  title="Delete photo"
                  aria-label="Delete photo"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div>
                <p className={`font-semibold uppercase tracking-wide ${themeClasses.textMuted}`}>Uploaded By</p>
                <p className={`truncate font-bold ${themeClasses.textPrimary}`}>{image.uploadedBy || '—'}</p>
              </div>
              <div>
                <p className={`font-semibold uppercase tracking-wide ${themeClasses.textMuted}`}>Project</p>
                <p className={`truncate font-bold ${themeClasses.textPrimary}`}>{image.projectName || '—'}</p>
              </div>
            </div>
          </footer>
        </article>
      ))}
    </div>
  );
};

export default SitePhotoGalleryGrid;
