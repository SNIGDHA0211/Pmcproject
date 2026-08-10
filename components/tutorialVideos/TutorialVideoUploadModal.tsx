import React, { useEffect, useState } from 'react';
import { ModalPortal } from '../ModalPortal';
import { getThemeClasses, useTheme } from '../../utils/theme';
import {
  formatTutorialVideoBytes,
  isSupportedTutorialVideoFile,
  tutorialSectionLabel,
  TUTORIAL_VIDEO_EXTENSIONS,
  TUTORIAL_VIDEO_SOFT_MAX_BYTES,
  type TutorialSectionKey,
} from '../../utils/tutorialVideosSections';

export type TutorialUploadFormValues = {
  title: string;
  description: string;
  file: File | null;
};

interface TutorialVideoUploadModalProps {
  open: boolean;
  section: TutorialSectionKey;
  isSaving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: TutorialUploadFormValues) => void | Promise<void>;
}

const TutorialVideoUploadModal: React.FC<TutorialVideoUploadModalProps> = ({
  open,
  section,
  isSaving = false,
  error = null,
  onClose,
  onSubmit,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDescription('');
    setFile(null);
    setLocalError(null);
  }, [open, section]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, isSaving, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const trimmed = title.trim();
    if (!trimmed) {
      setLocalError('Please enter a title.');
      return;
    }
    if (!file) {
      setLocalError('Please select a video file.');
      return;
    }
    if (!isSupportedTutorialVideoFile(file)) {
      setLocalError(
        `Please upload a supported video (${TUTORIAL_VIDEO_EXTENSIONS.join(', ')}).`,
      );
      return;
    }
    void onSubmit({ title: trimmed, description, file });
  };

  return (
    <ModalPortal open={open}>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
        role="presentation"
        onClick={() => {
          if (!isSaving) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-upload-title"
          className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3
                id="tutorial-upload-title"
                className={`text-xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}
              >
                Upload Tutorial
              </h3>
              <p className={`mt-1 text-[11px] ${themeClasses.textSecondary}`}>
                Queued for server encoding after upload. Prefer compressed MP4 under ~
                {formatTutorialVideoBytes(TUTORIAL_VIDEO_SOFT_MAX_BYTES)} — very large files
                can time out or fail on the server.
              </p>
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className={`rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-50 ${
                isDarkTheme
                  ? 'bg-white/10 text-white hover:bg-white/15'
                  : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }`}
            >
              Close
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Section
              </label>
              <p
                className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${themeClasses.border} ${themeClasses.bgSecondary} ${themeClasses.textPrimary}`}
              >
                {tutorialSectionLabel(section)}
              </p>
            </div>

            <div>
              <label
                htmlFor="tutorial-title"
                className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
              >
                Title *
              </label>
              <input
                id="tutorial-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSaving}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
                placeholder="How to upload meeting documents"
              />
            </div>

            <div>
              <label
                htmlFor="tutorial-description"
                className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
              >
                Description
              </label>
              <textarea
                id="tutorial-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSaving}
                rows={3}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
                placeholder="Short summary for viewers"
              />
            </div>

            <div>
              <label
                htmlFor="tutorial-file"
                className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
              >
                Video *
              </label>
              <input
                id="tutorial-file"
                type="file"
                accept={TUTORIAL_VIDEO_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
                disabled={isSaving}
                onChange={(e) => {
                  const next = e.target.files?.[0] ?? null;
                  setFile(next);
                  setLocalError(null);
                }}
                className={`block w-full text-sm ${themeClasses.textPrimary}`}
              />
              {file ? (
                <p className={`mt-1 text-[11px] font-semibold ${themeClasses.textSecondary}`}>
                  {file.name} · {formatTutorialVideoBytes(file.size)}
                  {file.size > TUTORIAL_VIDEO_SOFT_MAX_BYTES
                    ? ` — large file; consider compressing before upload`
                    : ''}
                </p>
              ) : null}
            </div>

            {(localError || error) && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                {localError || error}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={onClose}
                className={`rounded-xl border px-4 py-2 text-xs font-black uppercase tracking-wide disabled:opacity-50 ${themeClasses.buttonSecondary} ${themeClasses.border}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {isSaving ? 'Uploading…' : 'Upload Tutorial'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default TutorialVideoUploadModal;
