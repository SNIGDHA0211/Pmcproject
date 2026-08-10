import React from 'react';
import { PlayCircle } from 'lucide-react';
import { useTutorialVideoWatch } from '../../hooks/useTutorialVideoWatch';
import type { TutorialSectionKey } from '../../utils/tutorialVideosSections';
import { usePmcExecutiveTheme } from '../../utils/pmcExecutiveTheme';
import TutorialVideoPlayer from './TutorialVideoPlayer';

interface TutorialWatchButtonProps {
  section: TutorialSectionKey;
  /** Hero (Overview), panel header, or executive shell action row */
  variant?: 'hero' | 'panel' | 'shell';
  isDark?: boolean;
  className?: string;
  /** When ready videos change in the section panel, bump so this button reloads. */
  refreshKey?: string | number;
}

const TutorialWatchButton: React.FC<TutorialWatchButtonProps> = ({
  section,
  variant = 'panel',
  isDark = false,
  className = '',
  refreshKey,
}) => {
  const ex = usePmcExecutiveTheme();
  const {
    readyVideo,
    checking,
    openPlayer,
    playerOpen,
    playerTitle,
    playerDescription,
    playerUrl,
    playerLoading,
    playerError,
    closePlayer,
  } = useTutorialVideoWatch(section, refreshKey);

  if (checking || !readyVideo) {
    return null;
  }

  const isHero = variant === 'hero';
  const isShell = variant === 'shell';

  const heroClass = isDark ? 'pmc360-tutorial-watch-dark' : 'pmc360-tutorial-watch-light';

  const panelClass =
    'inline-flex items-center gap-2 rounded-xl border border-indigo-200/80 bg-indigo-600 px-3.5 py-2.5 text-[11px] font-black uppercase tracking-wide text-white shadow-md shadow-indigo-900/15 transition-all duration-200 hover:bg-indigo-500 hover:border-indigo-300';

  const buttonClass = isShell
    ? `${ex.shellBtnSecondary} ${className}`.trim()
    : isHero
      ? `inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-wide transition-all duration-200 sm:px-4 sm:py-2.5 sm:text-[11px] ${heroClass} ${className}`.trim()
      : `${panelClass} ${className}`.trim();

  return (
    <>
      <button
        type="button"
        onClick={() => void openPlayer()}
        title={readyVideo.title}
        aria-label={`Watch tutorial: ${readyVideo.title}`}
        className={buttonClass}
      >
        <PlayCircle
          size={14}
          strokeWidth={2.5}
          className={
            isHero ? (isDark ? 'text-cyan-300' : 'text-cyan-600') : undefined
          }
        />
        <span className="hidden min-[420px]:inline">Watch Tutorial</span>
        <span className="min-[420px]:hidden">Watch</span>
      </button>

      <TutorialVideoPlayer
        open={playerOpen}
        title={playerTitle}
        description={playerDescription}
        videoUrl={playerUrl}
        loading={playerLoading}
        error={playerError}
        onClose={closePlayer}
      />
    </>
  );
};

export default React.memo(TutorialWatchButton);
