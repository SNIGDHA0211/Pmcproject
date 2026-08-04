import React, { useState } from 'react';
import { Download, Maximize2, Pencil, Trash2 } from 'lucide-react';
import type { SiteImageRecord } from '../../types';
import {
  clampSiteImageTitle,
  downloadSiteImage,
  formatSiteImageUploadDate,
  getSiteImageDisplayTitle,
  getSiteImageUploaderLabel,
  SITE_IMAGE_TITLE_MAX_LENGTH,
} from '../../utils/siteImages';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface SitePhotoGalleryGridProps {
  images: SiteImageRecord[];
  onOpen: (index: number) => void;
  onDelete: (image: SiteImageRecord) => void;
  onUpdateTitle?: (image: SiteImageRecord, title: string) => Promise<void> | void;
}

const SitePhotoGalleryGrid: React.FC<SitePhotoGalleryGridProps> = ({
  images,
  onOpen,
  onDelete,
  onUpdateTitle,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [savingId, setSavingId] = useState<string | number | null>(null);

  const startEdit = (image: SiteImageRecord) => {
    setEditingId(image.id);
    setDraftTitle(image.title || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftTitle('');
  };

  const saveEdit = async (image: SiteImageRecord) => {
    if (!onUpdateTitle) {
      cancelEdit();
      return;
    }
    const next = clampSiteImageTitle(draftTitle);
    if (next === (image.title || '')) {
      cancelEdit();
      return;
    }
    setSavingId(image.id);
    try {
      await onUpdateTitle(image, next);
      cancelEdit();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="site-photo-gallery-grid grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
      {images.map((image, index) => {
        const isEditing = editingId === image.id;
        const isSaving = savingId === image.id;
        const displayTitle = getSiteImageDisplayTitle(image.title);

        return (
          <article
            key={image.id}
            className={`group overflow-hidden rounded-xl border transition-shadow hover:shadow-md ${themeClasses.glassCard} ${themeClasses.border}`}
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => onOpen(index)}
                className="relative block w-full overflow-hidden text-left"
                aria-label={`View photo: ${displayTitle}`}
              >
                <img
                  src={image.thumbnailUrl || image.imageUrl}
                  alt={displayTitle}
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
              <div className="grid grid-cols-1 gap-1.5 text-[10px] leading-snug">
                <div>
                  <div className="mb-0.5 flex items-center justify-between gap-1">
                    <p className={`font-semibold uppercase tracking-wide ${themeClasses.textMuted}`}>Title</p>
                    {onUpdateTitle && !isEditing && (
                      <button
                        type="button"
                        onClick={() => startEdit(image)}
                        className={`rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-white/10`}
                        title="Edit title"
                        aria-label="Edit title"
                      >
                        <Pencil size={11} />
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={draftTitle}
                        maxLength={SITE_IMAGE_TITLE_MAX_LENGTH}
                        disabled={isSaving}
                        autoFocus
                        onChange={(e) => setDraftTitle(clampSiteImageTitle(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveEdit(image);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        className={`w-full rounded-md border px-2 py-1 text-[11px] font-bold outline-none ${themeClasses.input} ${themeClasses.border}`}
                        placeholder="Add a title..."
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => void saveEdit(image)}
                          disabled={isSaving}
                          className="rounded-md bg-blue-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={isSaving}
                          className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${themeClasses.border} ${themeClasses.textSecondary}`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className={`line-clamp-2 font-bold ${
                        image.title?.trim() ? themeClasses.textPrimary : themeClasses.textMuted
                      }`}
                      title={image.title || undefined}
                    >
                      {displayTitle}
                    </p>
                  )}
                </div>

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
                  <p className={`truncate font-bold ${themeClasses.textPrimary}`}>
                    {getSiteImageUploaderLabel(image)}
                  </p>
                </div>
                <div>
                  <p className={`font-semibold uppercase tracking-wide ${themeClasses.textMuted}`}>Project</p>
                  <p className={`truncate font-bold ${themeClasses.textPrimary}`}>{image.projectName || '—'}</p>
                </div>
              </div>
            </footer>
          </article>
        );
      })}
    </div>
  );
};

export default SitePhotoGalleryGrid;
