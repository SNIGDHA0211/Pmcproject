import React from 'react';
import { ModalPortal } from '../ModalPortal';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface SitePhotoDeleteDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

const SitePhotoDeleteDialog: React.FC<SitePhotoDeleteDialogProps> = ({
  open,
  onCancel,
  onConfirm,
  isDeleting = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <ModalPortal open={open}>
      <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 p-4">
        <div
          className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`}
          role="alertdialog"
          aria-labelledby="delete-site-photo-title"
        >
          <h3 id="delete-site-photo-title" className={`text-lg font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
            Delete photo?
          </h3>
          <p className={`mt-2 text-sm ${themeClasses.textSecondary}`}>
            This will permanently remove the image from Cloudinary and the project gallery. This action cannot be undone.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold ${themeClasses.buttonSecondary} ${themeClasses.border} border`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-60"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default SitePhotoDeleteDialog;
