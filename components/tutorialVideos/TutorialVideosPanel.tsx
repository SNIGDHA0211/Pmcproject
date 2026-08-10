import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardToastStack, { type DashboardToastItem } from '../DashboardToastStack';
import TutorialVideoCard from './TutorialVideoCard';
import TutorialVideoPlayer from './TutorialVideoPlayer';
import TutorialVideoUploadModal, {
  type TutorialUploadFormValues,
} from './TutorialVideoUploadModal';
import TutorialWatchButton from './TutorialWatchButton';
import {
  getTutorialVideosErrorMessage,
  invalidateTutorialVideosSection,
  tutorialVideosApi,
  type TutorialVideo,
} from '../../services/tutorialVideosApi';
import { canManageTutorialVideos } from '../../utils/tutorialVideosAccess';
import { isAbortError } from '../../utils/isAbortError';
import { useDebouncedValue, SEARCH_DEBOUNCE_MS } from '../../hooks/useDebouncedValue';
import { getThemeClasses, useTheme } from '../../utils/theme';
import {
  tutorialSectionLabel,
  TUTORIAL_DEFAULT_ORDERING,
  TUTORIAL_DEFAULT_PAGE_SIZE,
  TUTORIAL_ORDERING_OPTIONS,
  type TutorialOrdering,
  type TutorialSectionKey,
} from '../../utils/tutorialVideosSections';
import { subscribeTutorialVideoPoll } from '../../utils/tutorialVideoPollCoordinator';
import { emitTutorialSectionUpdated } from '../../utils/tutorialVideosEvents';

interface TutorialVideosPanelProps {
  section: TutorialSectionKey;
  className?: string;
  /** Hide header Watch Tutorial (e.g. when shown in page hero) */
  hideWatchButton?: boolean;
}

function belongsToSection(video: TutorialVideo, section: TutorialSectionKey): boolean {
  return String(video.section || '').toLowerCase() === section.toLowerCase();
}

/** Keep freshly uploaded rows when list API lags; never override API terminal status. */
function mergeTutorialVideoRows(
  apiRows: TutorialVideo[],
  localRows: TutorialVideo[],
  section: TutorialSectionKey,
): TutorialVideo[] {
  const byId = new Map<number, TutorialVideo>();
  for (const row of apiRows) {
    if (belongsToSection(row, section)) byId.set(row.id, row);
  }
  for (const local of localRows) {
    if (!belongsToSection(local, section)) continue;
    // Only keep local if the API has not returned this id yet (upload race).
    if (!byId.has(local.id)) {
      byId.set(local.id, local);
    }
  }
  return Array.from(byId.values());
}

const TutorialVideosPanel: React.FC<TutorialVideosPanelProps> = ({
  section,
  className = '',
  hideWatchButton = false,
}) => {
  const { user } = useAuth();
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const canManage = canManageTutorialVideos(user);

  const [videos, setVideos] = useState<TutorialVideo[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [ordering, setOrdering] = useState<TutorialOrdering>(TUTORIAL_DEFAULT_ORDERING);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<DashboardToastItem[]>([]);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSaving, setUploadSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [featuredVideoId, setFeaturedVideoId] = useState<number | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reprocessingId, setReprocessingId] = useState<number | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerTitle, setPlayerTitle] = useState('');
  const [playerDescription, setPlayerDescription] = useState('');
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const toastIdRef = useRef(0);
  const readyToastShownRef = useRef<number | null>(null);
  const failedToastShownRef = useRef<Set<number>>(new Set());

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // Clear stale data when user opens a different sidebar module
  useEffect(() => {
    invalidateTutorialVideosSection(section);
    setVideos([]);
    setCount(0);
    setPage(1);
    setSearchInput('');
    setHasNext(false);
    setHasPrevious(false);
    setError(null);
    setLoading(true);
    setFeaturedVideoId(null);
    readyToastShownRef.current = null;
    failedToastShownRef.current.clear();
  }, [section]);

  const sectionVideos = useMemo(
    () => videos.filter((v) => belongsToSection(v, section)),
    [videos, section],
  );

  const processingKey = useMemo(
    () =>
      sectionVideos
        .filter((v) => String(v.status).toLowerCase() === 'processing')
        .map((v) => v.id)
        .sort((a, b) => a - b)
        .join(','),
    [sectionVideos],
  );

  const readyWatchKey = useMemo(
    () =>
      sectionVideos
        .filter((v) => String(v.status).toLowerCase() === 'ready')
        .map((v) => v.id)
        .sort((a, b) => a - b)
        .join(','),
    [sectionVideos],
  );

  useEffect(() => {
    if (!readyWatchKey) return;
    emitTutorialSectionUpdated(section);
  }, [readyWatchKey, section]);

  useEffect(() => {
    if (featuredVideoId == null) return;
    const row = sectionVideos.find((v) => v.id === featuredVideoId);
    if (!row) return;
    const status = String(row.status).toLowerCase();
    if (status === 'ready') {
      if (readyToastShownRef.current === featuredVideoId) return;
      readyToastShownRef.current = featuredVideoId;
      showToast('Tutorial is ready — click Watch Tutorial on the card to play.');
      return;
    }
    if (status === 'failed') {
      if (failedToastShownRef.current.has(featuredVideoId)) return;
      failedToastShownRef.current.add(featuredVideoId);
      showToast(
        row.error_message?.trim() ||
          'Processing failed. Retry if available, or delete and re-upload a smaller MP4.',
        'error',
      );
    }
  }, [sectionVideos, featuredVideoId, showToast]);

  const loadList = useCallback(
    async (opts?: { silent?: boolean; signal?: AbortSignal }) => {
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const result = await tutorialVideosApi.getTutorialVideos(section, {
          page,
          page_size: TUTORIAL_DEFAULT_PAGE_SIZE,
          search: search || undefined,
          ordering,
        });
        if (opts?.signal?.aborted) return;
        const rows = result.data.filter((v) => belongsToSection(v, section));
        setVideos((prev) => {
          const merged = mergeTutorialVideoRows(rows, prev, section);
          return merged;
        });
        setCount((prev) => Math.max(result.count, rows.length, prev));
        setHasNext(Boolean(result.next));
        setHasPrevious(Boolean(result.previous));
        setError(null);
      } catch (err) {
        if (isAbortError(err) || opts?.signal?.aborted) return;
        setError(getTutorialVideosErrorMessage(err, 'Unable to load tutorials.'));
        if (!opts?.silent) {
          setVideos([]);
          setCount(0);
          setHasNext(false);
          setHasPrevious(false);
        }
      } finally {
        if (!opts?.signal?.aborted && !opts?.silent) setLoading(false);
      }
    },
    [section, page, search, ordering],
  );

  // Reset pagination when section / search / ordering changes
  useEffect(() => {
    setPage(1);
  }, [section, search, ordering]);

  useEffect(() => {
    const controller = new AbortController();
    void loadList({ signal: controller.signal });
    return () => controller.abort();
  }, [loadList]);

  // While processing: occasional silent list refresh (list now includes status + processing_error)
  useEffect(() => {
    if (!processingKey) return;
    const timer = window.setInterval(() => {
      void loadList({ silent: true });
    }, 12000);
    return () => window.clearInterval(timer);
  }, [processingKey, loadList]);

  // Global singleton poll — one network request per video id regardless of React re-renders
  useEffect(() => {
    if (!processingKey) return;

    const ids = processingKey.split(',').map((id) => Number(id)).filter(Boolean);
    const applyUpdate = (updated: TutorialVideo) => {
      setVideos((prev) => {
        const idx = prev.findIndex((v) => v.id === updated.id);
        if (idx < 0) return prev;
        const current = prev[idx];
        const merged = { ...current, ...updated };
        if (
          current.status === merged.status &&
          current.updated_at === merged.updated_at &&
          current.error_message === merged.error_message
        ) {
          return prev;
        }
        return prev.map((v) => (v.id === updated.id ? merged : v));
      });
    };

    const unsubscribers = ids.map((id) =>
      subscribeTutorialVideoPoll(id, section, applyUpdate),
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [processingKey, section]);

  const handleUpload = async (values: TutorialUploadFormValues) => {
    if (!values.file) return;
    setUploadSaving(true);
    setUploadError(null);
    try {
      const created = await tutorialVideosApi.uploadTutorialVideo({
        title: values.title,
        description: values.description,
        section,
        upload: values.file,
      });
      setUploadOpen(false);
      showToast('Tutorial uploaded and queued for processing.');
      setFeaturedVideoId(created.id);
      readyToastShownRef.current = null;
      setVideos((prev) => {
        if (page !== 1 || search) return prev;
        if (!belongsToSection(created, section)) return prev;
        const without = prev.filter((v) => v.id !== created.id);
        return [created, ...without];
      });
      setCount((c) => c + 1);
      if (page !== 1 || search) {
        setPage(1);
        setSearchInput('');
      }
    } catch (err) {
      setUploadError(
        getTutorialVideosErrorMessage(err, 'Unable to upload tutorial. Please try again.'),
      );
    } finally {
      setUploadSaving(false);
    }
  };

  const handlePlay = async (video: TutorialVideo) => {
    if (String(video.status).toLowerCase() !== 'ready') return;
    setPlayingId(video.id);
    setPlayerOpen(true);
    setPlayerTitle(video.title);
    setPlayerDescription(video.description || '');
    setPlayerUrl(null);
    setPlayerError(null);
    setPlayerLoading(true);
    try {
      const playback = await tutorialVideosApi.getTutorialVideoPlaybackUrl(video.id);
      setPlayerUrl(playback.video_url);
      if (playback.title) setPlayerTitle(playback.title);
    } catch (err) {
      setPlayerError(
        getTutorialVideosErrorMessage(err, 'Unable to open tutorial video.'),
      );
    } finally {
      setPlayerLoading(false);
      setPlayingId(null);
    }
  };

  const handleReprocess = async (video: TutorialVideo) => {
    setReprocessingId(video.id);
    try {
      const updated = await tutorialVideosApi.reprocessTutorialVideo(video.id, section);
      setVideos((prev) =>
        prev.map((v) =>
          v.id === video.id
            ? { ...v, ...updated, status: updated.status || 'processing', error_message: null }
            : v,
        ),
      );
      setFeaturedVideoId(video.id);
      failedToastShownRef.current.delete(video.id);
      readyToastShownRef.current = null;
      showToast('Re-queued for processing.');
    } catch (err) {
      showToast(
        getTutorialVideosErrorMessage(
          err,
          'Unable to retry. Temp file may be gone — delete and re-upload instead.',
        ),
        'error',
      );
    } finally {
      setReprocessingId(null);
    }
  };

  const handleDelete = async (video: TutorialVideo) => {
    const failed = String(video.status).toLowerCase() === 'failed';
    const ok = window.confirm(
      failed
        ? `Delete failed tutorial “${video.title}” so you can upload it again?`
        : `Delete tutorial “${video.title}”? This cannot be undone.`,
    );
    if (!ok) return;
    setDeletingId(video.id);
    try {
      await tutorialVideosApi.deleteTutorialVideo(video.id, section);
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
      setCount((c) => Math.max(0, c - 1));
      showToast(failed ? 'Failed tutorial removed. You can upload again.' : 'Tutorial deleted.');
      if (failed) {
        setUploadError(null);
        setUploadOpen(true);
      }
    } catch (err) {
      showToast(
        getTutorialVideosErrorMessage(err, 'Unable to delete tutorial.'),
        'error',
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section
      className={`relative mt-6 rounded-2xl border p-4 sm:p-5 ${themeClasses.glassCard} ${themeClasses.border} ${className}`}
      aria-labelledby={`tutorial-videos-${section}`}
    >
      <DashboardToastStack toasts={toasts} />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            id={`tutorial-videos-${section}`}
            className={`text-sm font-black uppercase tracking-widest ${themeClasses.textPrimary}`}
          >
            Tutorial Videos
          </h3>
          <p className={`mt-0.5 text-xs font-semibold ${themeClasses.textSecondary}`}>
            {tutorialSectionLabel(section)} · guides for this module
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {!hideWatchButton ? (
            <TutorialWatchButton
              section={section}
              variant="panel"
              isDark={isDarkTheme}
              refreshKey={readyWatchKey}
            />
          ) : null}
          {canManage ? (
            <button
              type="button"
              onClick={() => {
                setUploadError(null);
                setUploadOpen(true);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-[11px] font-black uppercase tracking-wide sm:text-xs ${
                isDarkTheme
                  ? 'border-white/15 bg-white/10 text-white hover:bg-white/15'
                  : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Plus size={14} strokeWidth={2.5} />
              Upload Tutorial
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search tutorials…"
          className={`min-w-[12rem] flex-1 rounded-xl border px-3 py-2 text-sm font-semibold outline-none focus:ring-2 sm:max-w-xs ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
        />
        <select
          value={ordering}
          onChange={(e) => setOrdering(e.target.value as TutorialOrdering)}
          className={`rounded-xl border px-3 py-2 text-xs font-bold outline-none ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
        >
          {TUTORIAL_ORDERING_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={`h-36 animate-pulse rounded-2xl border ${themeClasses.border} ${
                isDarkTheme ? 'bg-white/5' : 'bg-slate-100'
              }`}
            />
          ))}
        </div>
      ) : error ? (
        <div className="space-y-2 py-6 text-center">
          <p className="text-sm font-bold text-rose-600">Unable to load tutorials.</p>
          <button
            type="button"
            onClick={() => void loadList()}
            className={`rounded-xl border px-3 py-1.5 text-xs font-black uppercase ${themeClasses.buttonSecondary} ${themeClasses.border}`}
          >
            Retry
          </button>
        </div>
      ) : sectionVideos.length === 0 ? (
        <div className="space-y-3 py-8 text-center">
          <p className={`text-sm font-semibold ${themeClasses.textSecondary}`}>
            No tutorials available for {tutorialSectionLabel(section)}.
          </p>
          {canManage ? (
            <button
              type="button"
              onClick={() => {
                setUploadError(null);
                setUploadOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white hover:bg-indigo-500"
            >
              + Upload Tutorial
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sectionVideos.map((video) => (
              <TutorialVideoCard
                key={video.id}
                video={video}
                canManage={canManage}
                onPlay={handlePlay}
                onDelete={canManage ? handleDelete : undefined}
                onReprocess={canManage ? handleReprocess : undefined}
                deleting={deletingId === video.id}
                reprocessing={reprocessingId === video.id}
                playing={playingId === video.id}
              />
            ))}
          </div>

          {(hasNext || hasPrevious || count > TUTORIAL_DEFAULT_PAGE_SIZE) && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className={`text-xs font-semibold ${themeClasses.textSecondary}`}>
                {count} tutorial{count === 1 ? '' : 's'} in {tutorialSectionLabel(section)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!hasPrevious || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${themeClasses.buttonSecondary}`}
                >
                  Previous
                </button>
                <span className={`text-xs font-semibold ${themeClasses.textSecondary}`}>
                  Page {page}
                </span>
                <button
                  type="button"
                  disabled={!hasNext || loading}
                  onClick={() => setPage((p) => p + 1)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${themeClasses.buttonSecondary}`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <TutorialVideoPlayer
        open={playerOpen}
        title={playerTitle}
        description={playerDescription}
        videoUrl={playerUrl}
        loading={playerLoading}
        error={playerError}
        onClose={() => {
          setPlayerOpen(false);
          setPlayerUrl(null);
          setPlayerError(null);
          setPlayerDescription('');
          setPlayingId(null);
        }}
      />

      <TutorialVideoUploadModal
        open={uploadOpen}
        section={section}
        isSaving={uploadSaving}
        error={uploadError}
        onClose={() => {
          if (!uploadSaving) setUploadOpen(false);
        }}
        onSubmit={handleUpload}
      />
    </section>
  );
};

export default React.memo(TutorialVideosPanel);

/** Use this wrapper so each sidebar module remounts with a clean state. */
export function TutorialVideosPanelForSection({
  section,
  className,
}: TutorialVideosPanelProps) {
  return <TutorialVideosPanel key={section} section={section} className={className} />;
}
