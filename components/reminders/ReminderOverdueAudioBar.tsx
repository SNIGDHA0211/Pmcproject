import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Volume2, VolumeX } from 'lucide-react';

type BarState = {
  playing: boolean;
  pending: boolean;
  showBar: boolean;
  label: string;
};

interface ReminderOverdueAudioBarProps {
  onStop?: () => void;
  onEnableSound?: () => void;
  /** Tap alarm body to open Reminders (keeps sound until Stop). */
  onOpenReminders?: () => void;
  /** When set, bar is driven by ReminderAlarmEngine instead of global module state. */
  forcedState?: BarState;
}

const ReminderOverdueAudioBar: React.FC<ReminderOverdueAudioBarProps> = ({
  onStop,
  onEnableSound,
  onOpenReminders,
  forcedState,
}) => {
  const [state, setState] = useState<BarState>(
    forcedState ?? { playing: false, pending: false, showBar: false, label: '' },
  );

  useEffect(() => {
    if (forcedState) setState(forcedState);
  }, [forcedState]);

  const show = state.showBar || state.playing || state.pending;
  if (!show || typeof document === 'undefined') return null;

  const handleOpenReminders = () => {
    onOpenReminders?.();
  };

  const handleStop = () => {
    onStop?.();
  };

  const handleEnable = () => {
    onEnableSound?.();
  };

  return createPortal(
    <div
      className="pointer-events-none fixed bottom-5 left-1/2 z-[100060] flex w-[min(92vw,480px)] -translate-x-1/2 justify-center"
      role="status"
      aria-live="assertive"
    >
      <div className="pointer-events-auto flex w-full items-center gap-3 rounded-2xl border border-amber-300/80 bg-slate-900 px-4 py-3 text-white shadow-2xl shadow-amber-900/30">
        <button
          type="button"
          onClick={handleOpenReminders}
          className="flex min-w-0 flex-1 items-center gap-3 text-left transition hover:opacity-90"
          title="Open Reminders"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
            <Volume2 size={18} className={state.playing ? 'animate-pulse' : undefined} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wide text-amber-200">
              Reminder alarm
            </p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-300">
              {state.label || 'Due now'}
              {state.pending && !state.playing ? ' — tap Enable sound' : ' — tap to open Reminders'}
            </p>
          </div>
          {onOpenReminders ? (
            <ChevronRight size={16} className="shrink-0 text-amber-300/80" aria-hidden />
          ) : null}
        </button>
        {state.pending && !state.playing ? (
          <button
            type="button"
            onClick={handleEnable}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-900 hover:bg-amber-300"
          >
            <Volume2 size={14} aria-hidden />
            Enable sound
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleStop}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-900 hover:bg-amber-50"
          title="Stop alarm and open Reminders"
        >
          <VolumeX size={14} aria-hidden />
          Stop
        </button>
      </div>
    </div>,
    document.body,
  );
};

export default React.memo(ReminderOverdueAudioBar);
