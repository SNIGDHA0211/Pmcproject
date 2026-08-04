import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import {
  clampSiteImageTitle,
  isAllowedSiteImageFile,
  SITE_IMAGE_ACCEPT,
  SITE_IMAGE_MAX_FILES,
  SITE_IMAGE_TITLE_MAX_LENGTH,
} from '../../utils/siteImages';
import { getThemeClasses, useTheme } from '../../utils/theme';

export type SitePhotoUploadRequest = {
  files: File[];
  /** Shared title for all images (used when per-image titles are empty / identical). */
  title?: string;
  /** Per-image titles by index. */
  titles?: string[];
};

interface SitePhotoUploadPanelProps {
  disabled?: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
  onUpload: (payload: SitePhotoUploadRequest) => void;
  compact?: boolean;
}

type StagedFile = {
  id: string;
  file: File;
  title: string;
  previewUrl: string;
};

const SitePhotoUploadPanel: React.FC<SitePhotoUploadPanelProps> = ({
  disabled = false,
  isUploading = false,
  uploadProgress = 0,
  onUpload,
  compact = true,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [sharedTitle, setSharedTitle] = useState('');
  const [staged, setStaged] = useState<StagedFile[]>([]);

  useEffect(() => {
    return () => {
      staged.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
    // Only revoke on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearStaged = useCallback(() => {
    setStaged((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  }, []);

  const processFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length || disabled || isUploading) return;
      const files = Array.from(fileList);
      const invalid = files.filter((f) => !isAllowedSiteImageFile(f));
      if (invalid.length) {
        setLocalError('Only JPG, JPEG, PNG, and WEBP images are supported.');
        return;
      }

      setStaged((prev) => {
        const remaining = SITE_IMAGE_MAX_FILES - prev.length;
        if (remaining <= 0) {
          setLocalError(`Maximum ${SITE_IMAGE_MAX_FILES} images per upload.`);
          return prev;
        }
        const accepted = files.slice(0, remaining);
        if (files.length > remaining) {
          setLocalError(`Only ${SITE_IMAGE_MAX_FILES} images allowed. Extra files were skipped.`);
        } else {
          setLocalError(null);
        }
        const defaultTitle = clampSiteImageTitle(sharedTitle);
        return [
          ...prev,
          ...accepted.map((file, index) => ({
            id: `${file.name}-${file.size}-${file.lastModified}-${prev.length + index}`,
            file,
            title: defaultTitle,
            previewUrl: URL.createObjectURL(file),
          })),
        ];
      });
    },
    [disabled, isUploading, sharedTitle]
  );

  const applySharedTitleToAll = () => {
    const next = clampSiteImageTitle(sharedTitle);
    setStaged((prev) => prev.map((item) => ({ ...item, title: next })));
  };

  const handleConfirmUpload = () => {
    if (!staged.length || disabled || isUploading) return;
    const files = staged.map((s) => s.file);
    const titles = staged.map((s) => clampSiteImageTitle(s.title));
    const allSame = titles.every((t) => t === titles[0]);
    const shared = clampSiteImageTitle(sharedTitle);

    if (titles.some((t) => t.length > 0) && !allSame) {
      onUpload({ files, titles });
    } else if (titles[0] || shared) {
      onUpload({ files, title: titles[0] || shared });
    } else {
      onUpload({ files });
    }
    clearStaged();
    setSharedTitle('');
  };

  const padding = compact ? 'p-3' : 'p-6';
  const iconSize = compact ? 16 : 22;
  const iconWrap = compact ? 'h-8 w-8 mb-1.5' : 'h-12 w-12 mb-3';
  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm outline-none ${themeClasses.input} ${themeClasses.border}`;

  return (
    <div className="site-photo-upload-panel space-y-3">
      <div>
        <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
          Title <span className={`font-medium normal-case tracking-normal ${themeClasses.textMuted}`}>(optional)</span>
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={sharedTitle}
            maxLength={SITE_IMAGE_TITLE_MAX_LENGTH}
            disabled={disabled || isUploading}
            placeholder="e.g. Foundation Progress - Block A"
            onChange={(e) => setSharedTitle(clampSiteImageTitle(e.target.value))}
            className={inputClass}
          />
          {staged.length > 0 && (
            <button
              type="button"
              onClick={applySharedTitleToAll}
              disabled={disabled || isUploading}
              className={`shrink-0 rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${themeClasses.buttonSecondary} ${themeClasses.border}`}
            >
              Apply to all
            </button>
          )}
        </div>
        <p className={`mt-1 text-[10px] ${themeClasses.textMuted}`}>
          Same title for all images, or set a title per photo below. Max {SITE_IMAGE_TITLE_MAX_LENGTH} characters.
        </p>
      </div>

      <div
        className={`rounded-xl border-2 border-dashed ${padding} transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-500/10'
            : isDarkTheme
              ? 'border-white/20 bg-white/5'
              : 'border-slate-300 bg-slate-50/80'
        } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !isUploading) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          processFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={SITE_IMAGE_ACCEPT}
          multiple
          className="sr-only"
          disabled={disabled || isUploading}
          onChange={(e) => {
            processFiles(e.target.files);
            e.target.value = '';
          }}
        />

        <div className="flex flex-col items-center text-center">
          <span
            className={`flex items-center justify-center rounded-full ${iconWrap} ${
              isDarkTheme ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600'
            }`}
          >
            <Upload size={iconSize} />
          </span>
          <p className={`text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
            Drag & drop site photos
          </p>
          <p className={`mt-0.5 text-[10px] ${themeClasses.textSecondary}`}>
            JPG, JPEG, PNG, WEBP · up to {SITE_IMAGE_MAX_FILES} files
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isUploading || staged.length >= SITE_IMAGE_MAX_FILES}
            className={`mt-2 rounded-lg px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${themeClasses.buttonPrimary}`}
          >
            Browse files
          </button>
        </div>
      </div>

      {staged.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
              Ready to upload ({staged.length}/{SITE_IMAGE_MAX_FILES})
            </p>
            <button
              type="button"
              onClick={clearStaged}
              disabled={isUploading}
              className={`text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:underline disabled:opacity-50`}
            >
              Clear all
            </button>
          </div>
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {staged.map((item, index) => (
              <li
                key={item.id}
                className={`flex items-start gap-2 rounded-xl border p-2 ${themeClasses.border} ${
                  isDarkTheme ? 'bg-white/[0.03]' : 'bg-white'
                }`}
              >
                <img
                  src={item.previewUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className={`truncate text-[10px] font-bold ${themeClasses.textMuted}`}>{item.file.name}</p>
                  <input
                    type="text"
                    value={item.title}
                    maxLength={SITE_IMAGE_TITLE_MAX_LENGTH}
                    disabled={disabled || isUploading}
                    placeholder={`Title for image ${index + 1} (optional)`}
                    onChange={(e) => {
                      const value = clampSiteImageTitle(e.target.value);
                      setStaged((prev) =>
                        prev.map((row) => (row.id === item.id ? { ...row, title: value } : row))
                      );
                    }}
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => {
                    URL.revokeObjectURL(item.previewUrl);
                    setStaged((prev) => prev.filter((row) => row.id !== item.id));
                  }}
                  className={`mt-1 rounded-md p-1 text-rose-500 hover:bg-rose-500/10 disabled:opacity-50`}
                  aria-label="Remove file"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleConfirmUpload}
            disabled={disabled || isUploading || !staged.length}
            className={`w-full rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest ${themeClasses.buttonPrimary} disabled:opacity-50`}
          >
            {isUploading ? 'Uploading...' : `Upload ${staged.length} photo${staged.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {isUploading && (
        <div>
          <p className={`mb-1 text-center text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
            Uploading...
          </p>
          <div className={`h-1.5 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="mt-1 text-center text-sm font-black tabular-nums text-blue-600">{uploadProgress}%</p>
        </div>
      )}

      {localError && <p className="text-center text-[10px] font-bold text-rose-500">{localError}</p>}
    </div>
  );
};

export default SitePhotoUploadPanel;
