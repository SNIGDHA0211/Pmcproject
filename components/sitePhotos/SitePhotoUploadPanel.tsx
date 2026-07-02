import React, { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { isAllowedSiteImageFile, SITE_IMAGE_ACCEPT } from '../../utils/siteImages';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface SitePhotoUploadPanelProps {
  disabled?: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
  onUpload: (files: File[]) => void;
  compact?: boolean;
}

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

  const processFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length || disabled || isUploading) return;
      const files = Array.from(fileList);
      const invalid = files.filter((f) => !isAllowedSiteImageFile(f));
      if (invalid.length) {
        setLocalError('Only JPG, JPEG, PNG, and WEBP images are supported.');
        return;
      }
      setLocalError(null);
      onUpload(files);
    },
    [disabled, isUploading, onUpload]
  );

  const padding = compact ? 'p-3' : 'p-6';
  const iconSize = compact ? 16 : 22;
  const iconWrap = compact ? 'h-8 w-8 mb-1.5' : 'h-12 w-12 mb-3';

  return (
    <div
      className={`site-photo-upload-panel rounded-xl border-2 border-dashed ${padding} transition-colors ${
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
          JPG, JPEG, PNG, WEBP · multiple files
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isUploading}
          className={`mt-2 rounded-lg px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${themeClasses.buttonPrimary}`}
        >
          Browse files
        </button>
      </div>

      {isUploading && (
        <div className="mt-2.5">
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

      {localError && <p className="mt-2 text-center text-[10px] font-bold text-rose-500">{localError}</p>}
    </div>
  );
};

export default SitePhotoUploadPanel;
