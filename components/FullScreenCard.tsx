import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from './Icons';
import { useTheme, getThemeClasses } from '../utils/theme';

interface FullScreenCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps a card/section and adds a full-screen button. When clicked, the content
 * is shown in a centered modal with ease-in-out transition.
 */
export const FullScreenCard: React.FC<FullScreenCardProps> = ({ title, children, className = '' }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);

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

  const expandButton = (
    <button
      type="button"
      onClick={() => setIsFullScreen(true)}
      className={`absolute top-2 right-2 z-10 p-1.5 rounded-lg border transition-colors ${themeClasses.buttonSecondary} ${themeClasses.border}`}
      title="Expand to full screen"
      aria-label="Expand to full screen"
    >
      <Icons.FullScreen size={14} />
    </button>
  );

  if (isFullScreen && typeof document !== 'undefined') {
    return createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md"
        style={{
          transition: 'background-color 0.3s ease-in-out',
          backgroundColor: isAnimatingIn 
            ? (isDarkTheme ? 'rgba(0, 0, 0, 0.9)' : 'rgba(15, 23, 42, 0.4)') 
            : 'rgba(0, 0, 0, 0)',
        }}
        onClick={(e) => e.target === e.currentTarget && setIsFullScreen(false)}
      >
        <div
          className={`flex flex-col rounded-2xl border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden ${themeClasses.glassCard} ${themeClasses.border}`}
          style={{
            transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
            opacity: isAnimatingIn ? 1 : 0,
            transform: isAnimatingIn ? 'scale(1)' : 'scale(0.95)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <header className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${themeClasses.bgSecondary} ${themeClasses.border}`}>
            <h2 className={`text-sm font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>{title}</h2>
            <button
              type="button"
              onClick={() => setIsFullScreen(false)}
              className={`p-2 rounded-lg transition-colors ${themeClasses.buttonSecondary}`}
              title="Close full screen"
              aria-label="Close full screen"
            >
              <Icons.Close size={20} />
            </button>
          </header>
          <div className="flex-1 overflow-auto p-4 min-h-0">
            {children}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className={`relative ${className}`}>
      {expandButton}
      {children}
    </div>
  );
};
