import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from './Icons';
import { CardActionToolbar, CardEditButton, CardExpandButton } from './FormulaInfoButton';
import { useTheme, getThemeClasses } from '../utils/theme';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';

export type FullScreenExpandSize = 'default' | 'fullWidth';

type FullScreenExpandContextValue = {
  isExpanded: boolean;
  expandSize: FullScreenExpandSize;
};

const FullScreenExpandContext = createContext<FullScreenExpandContextValue>({
  isExpanded: false,
  expandSize: 'default',
});

/** Chart sections can read this to grow when the card is in expand view. */
export function useFullScreenExpand() {
  return useContext(FullScreenExpandContext);
}

export type FullScreenCardActionsContextValue = {
  requestFullScreen: () => void;
  onEdit?: () => void;
  editTitle: string;
};

const FullScreenCardActionsContext = createContext<FullScreenCardActionsContextValue | null>(null);

/** Read edit/expand handlers when rendered inside FullScreenCard */
export function useFullScreenCardActions() {
  return useContext(FullScreenCardActionsContext);
}

/** Inline header toolbar — info/edit/expand share one aligned row */
export const FullScreenHeaderToolbar: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const fs = useFullScreenCardActions();

  if (!children && !fs) return null;

  return (
    <CardActionToolbar>
      {children}
      {fs?.onEdit && <CardEditButton onClick={fs.onEdit} title={fs.editTitle} />}
      {fs && <CardExpandButton onClick={fs.requestFullScreen} title="Expand to full screen" />}
    </CardActionToolbar>
  );
};

interface FullScreenCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  onEdit?: () => void;
  editTitle?: string;
  /** `fullWidth` — edge-to-edge modal for wide charts (Financial Progress, Manpower). */
  expandSize?: FullScreenExpandSize;
}

/**
 * Wraps a card/section and adds a full-screen button. When clicked, the content
 * is shown in a centered modal with ease-in-out transition.
 */
export const FullScreenCard: React.FC<FullScreenCardProps> = ({
  title,
  children,
  className = '',
  onEdit,
  editTitle = 'Edit',
  expandSize = 'default',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);

  const actionsValue = useMemo<FullScreenCardActionsContextValue>(
    () => ({
      requestFullScreen: () => setIsFullScreen(true),
      onEdit,
      editTitle,
    }),
    [onEdit, editTitle]
  );

  useEffect(() => {
    if (isFullScreen) {
      const t = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimatingIn(true));
      });
      return () => cancelAnimationFrame(t);
    } else {
      setIsAnimatingIn(false);
    }
  }, [isFullScreen]);

  if (isFullScreen && typeof document !== 'undefined') {
    const isFullWidth = expandSize === 'fullWidth';

    return createPortal(
      <div
        className={`fixed inset-0 z-[100] flex backdrop-blur-md ${
          isFullWidth ? 'items-stretch justify-stretch p-3 sm:p-4' : 'items-center justify-center p-4'
        }`}
        style={{
          transition: 'background-color 0.3s ease-in-out',
          backgroundColor: isAnimatingIn
            ? isDarkTheme
              ? 'rgba(0, 0, 0, 0.9)'
              : 'rgba(15, 23, 42, 0.4)'
            : 'rgba(0, 0, 0, 0)',
        }}
        onClick={(e) => e.target === e.currentTarget && setIsFullScreen(false)}
      >
        <div
          className={`flex flex-col overflow-hidden border shadow-2xl ${themeClasses.glassCard} ${themeClasses.border} ${
            isFullWidth
              ? 'h-full w-full max-h-none max-w-none rounded-xl sm:rounded-2xl'
              : 'max-h-[90vh] w-full max-w-4xl rounded-2xl'
          }`}
          style={{
            transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
            opacity: isAnimatingIn ? 1 : 0,
            transform: isAnimatingIn ? 'scale(1)' : 'scale(0.95)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <header
            className={`flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-5 ${themeClasses.bgSecondary} ${themeClasses.border}`}
          >
            <h2 className={typo.fullScreenTitle}>{title}</h2>
            <CardActionToolbar>
              {onEdit && <CardEditButton onClick={onEdit} title={editTitle} />}
              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${themeClasses.buttonSecondary}`}
                title="Close full screen"
                aria-label="Close full screen"
              >
                <Icons.Close size={18} />
              </button>
            </CardActionToolbar>
          </header>
          <div
            className={`min-h-0 flex-1 overflow-auto ${
              isFullWidth ? 'flex flex-col p-3 sm:p-4' : 'p-4'
            }`}
          >
            <FullScreenExpandContext.Provider value={{ isExpanded: true, expandSize }}>
              <div className={isFullWidth ? 'flex min-h-0 flex-1 flex-col' : undefined}>{children}</div>
            </FullScreenExpandContext.Provider>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <FullScreenCardActionsContext.Provider value={actionsValue}>
      <div className={`relative ${className}`}>{children}</div>
    </FullScreenCardActionsContext.Provider>
  );
};
