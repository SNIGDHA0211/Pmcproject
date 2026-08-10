import React from 'react';
import { PlayCircle } from 'lucide-react';
import type { TutorialVideo } from '../../services/tutorialVideosApi';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface TutorialVideoCardProps {
  video: TutorialVideo;
  canManage?: boolean;
  onPlay?: (video: TutorialVideo) => void;
  onDelete?: (video: TutorialVideo) => void;
  onReprocess?: (video: TutorialVideo) => void;
  deleting?: boolean;
  reprocessing?: boolean;
  playing?: boolean;
}

const statusLabel = (status: string): string => {
  const s = status.toLowerCase();
  if (s === 'ready') return 'Ready';
  if (s === 'failed') return 'Failed';
  if (s === 'processing') return 'Processing';
  return status || 'Unknown';
};

const statusClass = (status: string, isDark: boolean): string => {
  const s = status.toLowerCase();
  if (s === 'ready') {
    return isDark
      ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (s === 'failed') {
    return isDark
      ? 'border-rose-400/30 bg-rose-500/15 text-rose-300'
      : 'border-rose-200 bg-rose-50 text-rose-700';
  }
  return isDark
    ? 'border-amber-400/30 bg-amber-500/15 text-amber-300'
    : 'border-amber-200 bg-amber-50 text-amber-800';
};

const TutorialVideoCard: React.FC<TutorialVideoCardProps> = ({
  video,
  canManage = false,
  onPlay,
  onDelete,
  onReprocess,
  deleting = false,
  reprocessing = false,
  playing = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const status = String(video.status || '').toLowerCase();
  const isReady = status === 'ready';
  const isFailed = status === 'failed';
  const isProcessing = !isReady && !isFailed;
  const busy = deleting || reprocessing || playing;

  return (
    <article
      className={`flex flex-col rounded-2xl border p-4 shadow-sm ${themeClasses.glassCard} ${themeClasses.border}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className={`min-w-0 flex-1 text-sm font-black leading-snug ${themeClasses.textPrimary}`}>
          {video.title}
        </h4>
        <span
          className={`shrink-0 rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${statusClass(status, isDarkTheme)}`}
        >
          {statusLabel(status)}
        </span>
      </div>

      {video.description ? (
        <p className={`mb-2 line-clamp-3 text-xs font-medium leading-relaxed ${themeClasses.textSecondary}`}>
          {video.description}
        </p>
      ) : (
        <p className={`mb-2 text-xs italic ${themeClasses.textMuted}`}>No description</p>
      )}

      {isProcessing ? (
        <p className={`mb-3 text-[11px] font-semibold leading-snug ${themeClasses.textSecondary}`}>
          Encoding on the server (may take several minutes). Status updates automatically.
          Large files can fail — prefer compressed MP4 under ~80&nbsp;MB.
        </p>
      ) : null}

      {isFailed ? (
        <p className={`mb-3 text-[11px] font-semibold leading-snug ${isDarkTheme ? 'text-rose-300' : 'text-rose-700'}`}>
          {video.error_message?.trim()
            ? video.error_message
            : 'Processing failed. Retry if the temp file remains, otherwise delete and re-upload a smaller MP4.'}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        {isReady && onPlay ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onPlay(video)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <PlayCircle size={14} strokeWidth={2.5} />
            {playing ? 'Opening…' : 'Watch Tutorial'}
          </button>
        ) : null}

        {isProcessing ? (
          <span
            className={`inline-flex rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wide opacity-80 ${themeClasses.buttonSecondary} ${themeClasses.border}`}
          >
            Processing...
          </span>
        ) : null}

        {isFailed ? (
          <span
            className={`inline-flex rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wide ${
              isDarkTheme
                ? 'border-rose-400/30 bg-rose-500/10 text-rose-300'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            Processing Failed
          </span>
        ) : null}

        {canManage && isFailed && onReprocess ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onReprocess(video)}
            className="rounded-xl border border-indigo-200 bg-indigo-600/10 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-indigo-700 hover:bg-indigo-600/20 disabled:opacity-50"
          >
            {reprocessing ? '…' : 'Retry Processing'}
          </button>
        ) : null}

        {canManage && onDelete ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(video)}
            className="rounded-xl bg-rose-600/10 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-rose-600 hover:bg-rose-600/20 disabled:opacity-50"
          >
            {deleting ? '…' : isFailed ? 'Delete & Re-upload' : 'Delete'}
          </button>
        ) : null}
      </div>
    </article>
  );
};

export default React.memo(TutorialVideoCard);
