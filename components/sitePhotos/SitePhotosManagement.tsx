import React, { useEffect, useState } from 'react';
import { ImageIcon, Plus } from 'lucide-react';
import type { Project, User } from '../../types';
import type { SiteImageRecord } from '../../types';
import { useSiteImages } from '../../hooks/useSiteImages';
import { getApiErrorMessage, siteImagesApi } from '../../services/api';
import DashboardCardTopAccent from '../DashboardCardTopAccent';
import { Icons } from '../Icons';
import SitePhotoDeleteDialog from './SitePhotoDeleteDialog';
import SitePhotoFilters from './SitePhotoFilters';
import SitePhotoGalleryGrid from './SitePhotoGalleryGrid';
import SitePhotoGallerySkeleton from './SitePhotoGallerySkeleton';
import SitePhotoGallerySummary from './SitePhotoGallerySummary';
import SitePhotoLightbox from './SitePhotoLightbox';
import SitePhotoUploadPanel from './SitePhotoUploadPanel';
import { getLatestSiteImageUploadDate, MONTH_OPTIONS } from '../../utils/siteImages';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface SitePhotosManagementProps {
  projects?: Project[];
  currentUser?: User;
}

const SitePhotosManagement: React.FC<SitePhotosManagementProps> = ({ projects = [] }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const now = new Date();
  const [projectName, setProjectName] = useState(projects[0]?.title ?? '');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SiteImageRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { images, isLoading, error, refresh } = useSiteImages(projectName, month, year);

  const monthLabel = `${MONTH_OPTIONS.find((m) => m.value === month)?.label ?? 'Month'} ${year}`;
  const hasPhotos = images.length > 0;

  useEffect(() => {
    if (!isLoading && projectName) {
      setShowUpload(images.length === 0);
    }
  }, [images.length, isLoading, projectName, month, year]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  };

  const handleUpload = async (files: File[]) => {
    if (!projectName.trim()) {
      setUploadError('Select a project before uploading.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    try {
      await siteImagesApi.upload(
        {
          project_name: projectName.trim(),
          month,
          year,
          images: files,
        },
        setUploadProgress
      );
      showToast(`${files.length} photo${files.length > 1 ? 's' : ''} uploaded successfully.`);
      setShowUpload(false);
      await refresh();
    } catch (err) {
      setUploadError(getApiErrorMessage(err, 'Upload failed. Please try again.'));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await siteImagesApi.delete(deleteTarget.id);
      showToast('Photo deleted.');
      setDeleteTarget(null);
      if (lightboxIndex !== null) setLightboxIndex(null);
      await refresh();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Unable to delete photo.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const renderGalleryBody = () => {
    if (!projectName) {
      return (
        <p className={`py-10 text-center text-sm font-bold ${themeClasses.textMuted}`}>
          Select a project to view photos.
        </p>
      );
    }
    if (isLoading) return <SitePhotoGallerySkeleton />;
    if (error) return <p className="py-10 text-center text-sm font-bold text-rose-500">{error}</p>;
    if (!hasPhotos) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span
            className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${
              isDarkTheme ? 'bg-white/10 text-white/50' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <ImageIcon size={24} />
          </span>
          <p className={`text-sm font-black uppercase tracking-widest ${themeClasses.textMuted}`}>
            No images for this month.
          </p>
          <p className={`mt-1 text-xs ${themeClasses.textSecondary}`}>
            Use Upload Images below to add progress photos.
          </p>
        </div>
      );
    }
    return (
      <SitePhotoGalleryGrid images={images} onOpen={setLightboxIndex} onDelete={setDeleteTarget} />
    );
  };

  return (
    <div className="site-photos-management space-y-4 p-4 md:p-6">
      {toast && (
        <div className="fixed right-4 top-4 z-[120] rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={`text-2xl font-black uppercase tracking-tighter ${themeClasses.textPrimary}`}>
            Site Photos
          </h2>
          <p className={`mt-0.5 text-[10px] font-bold uppercase tracking-widest ${themeClasses.textSecondary}`}>
            Monthly construction progress gallery
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isLoading || !projectName}
          className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${themeClasses.buttonSecondary} ${themeClasses.border}`}
        >
          Refresh
        </button>
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl border p-4 ${themeClasses.glassCard} ${themeClasses.border} shadow-sm`}
      >
        <DashboardCardTopAccent />
        <div className="pt-1">
          <SitePhotoFilters
            projects={projects}
            projectName={projectName}
            month={month}
            year={year}
            onProjectChange={setProjectName}
            onMonthChange={setMonth}
            onYearChange={setYear}
          />
        </div>
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl border p-4 ${themeClasses.glassCard} ${themeClasses.border} shadow-sm`}
      >
        <DashboardCardTopAccent />
        <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-2 pt-1 ${themeClasses.border}`}>
          <div>
            <h3 className={`text-sm font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
              Upload Images
            </h3>
            {!showUpload && (
              <p className={`mt-0.5 text-[10px] font-medium ${themeClasses.textMuted}`}>
                {hasPhotos ? 'Add more photos for this period' : 'Expand to upload'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowUpload((v) => !v)}
            disabled={!projectName}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest ${themeClasses.buttonPrimary} disabled:opacity-50`}
          >
            {showUpload ? (
              <>
                <Icons.Close size={12} />
                Hide Upload
              </>
            ) : (
              <>
                <Plus size={12} />
                Upload Photos
              </>
            )}
          </button>
        </div>

        {showUpload && (
          <div className="mt-3">
            <SitePhotoUploadPanel
              disabled={!projectName}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              onUpload={handleUpload}
              compact
            />
            {uploadError && <p className="mt-2 text-[10px] font-bold text-rose-500">{uploadError}</p>}
          </div>
        )}

        {!projectName && (
          <p className={`py-4 text-center text-xs font-bold ${themeClasses.textMuted}`}>
            Select a project in the filters above to upload photos.
          </p>
        )}
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl border p-4 ${themeClasses.glassCard} ${themeClasses.border} shadow-sm`}
      >
        <DashboardCardTopAccent />
        <div className={`mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2 pt-1 ${themeClasses.border}`}>
          <h3 className={`text-sm font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
            Image Gallery
          </h3>
        </div>

        {projectName && !isLoading && (
          <div className="mb-3">
            <SitePhotoGallerySummary
              totalPhotos={images.length}
              latestUploadDate={getLatestSiteImageUploadDate(images)}
              projectName={projectName}
              monthLabel={monthLabel}
            />
          </div>
        )}

        {renderGalleryBody()}
      </div>

      {lightboxIndex !== null && images.length > 0 && (
        <SitePhotoLightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          onDelete={setDeleteTarget}
        />
      )}

      <SitePhotoDeleteDialog
        open={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default SitePhotosManagement;
