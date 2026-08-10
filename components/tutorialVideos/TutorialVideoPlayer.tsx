import React, { useEffect, useRef, useState } from 'react';
import { Play, X } from 'lucide-react';
import { ModalPortal } from '../ModalPortal';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface TutorialVideoPlayerProps {
  open: boolean;
  title: string;
  description?: string;
  videoUrl: string | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
}

const TutorialVideoPlayer: React.FC<TutorialVideoPlayerProps> = ({
  open,
  title,
  description,
  videoUrl,
  loading = false,
  error = null,
  onClose,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaError, setMediaError] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMediaError(false);
    setHasStarted(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, videoUrl]);

  useEffect(() => {
    if (!open) {
      videoRef.current?.pause();
    }
  }, [open]);

  const handlePlayClick = () => {
    const el = videoRef.current;
    if (!el) return;
    void el.play().then(() => setHasStarted(true)).catch(() => setHasStarted(false));
  };

  const showPlayOverlay = Boolean(videoUrl) && !loading && !error && !mediaError && !hasStarted;

  return (
    <ModalPortal open={open}>
      <div
        className="fixed inset-0 z-[100060] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
        role="presentation"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-video-player-title"
          className={`flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border shadow-2xl sm:rounded-3xl ${themeClasses.bgPrimary} ${themeClasses.border}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3 sm:px-5 sm:py-4 ${themeClasses.border}`}
          >
            <div className="min-w-0 flex-1">
              <h3
                id="tutorial-video-player-title"
                className={`truncate text-sm font-black uppercase tracking-tight sm:text-base ${themeClasses.textPrimary}`}
              >
                {title || 'Tutorial'}
              </h3>
              {description ? (
                <p className={`mt-1 line-clamp-2 text-xs font-medium ${themeClasses.textSecondary}`}>
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close video"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                isDarkTheme
                  ? 'bg-white/10 text-white hover:bg-white/15'
                  : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }`}
            >
              <X size={18} />
            </button>
          </div>

          <div className="relative bg-black">
            {loading ? (
              <div className="flex aspect-video min-h-[200px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <p className="text-sm font-semibold text-white/90">Opening tutorial…</p>
                </div>
              </div>
            ) : error || mediaError || !videoUrl ? (
              <div className="flex aspect-video min-h-[200px] flex-col items-center justify-center gap-3 px-4 text-center">
                <p className="text-sm font-bold text-rose-300">
                  {error || 'Unable to play this tutorial.'}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  key={videoUrl}
                  src={videoUrl}
                  controls={hasStarted}
                  playsInline
                  preload="metadata"
                  className="aspect-video max-h-[75vh] w-full bg-black"
                  onPlay={() => setHasStarted(true)}
                  onError={() => setMediaError(true)}
                >
                  Your browser does not support video playback.
                </video>

                {showPlayOverlay ? (
                  <button
                    type="button"
                    onClick={handlePlayClick}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45 transition hover:bg-black/55"
                    aria-label="Play tutorial video"
                  >
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 ring-4 ring-white/20 sm:h-20 sm:w-20">
                      <Play size={32} className="ml-1" fill="currentColor" />
                    </span>
                    <span className="rounded-full bg-black/60 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-white">
                      Play Video
                    </span>
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default TutorialVideoPlayer;
