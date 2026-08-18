import React from 'react';
import { Icons } from './Icons';
import { getThemeClasses, useTheme } from '../utils/theme';

const shimmerBar = (isDark: boolean) =>
  isDark
    ? 'bg-gradient-to-r from-white/5 via-white/15 to-white/5'
    : 'bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100';

export const WorkspaceLoadingPanel: React.FC<{
  title?: string;
  subtitle?: string;
}> = ({
  title = 'Loading your workspace',
  subtitle = 'Fetching your projects and preparing the dashboard. This only takes a moment.',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <div className="flex min-h-[62vh] w-full items-center justify-center px-3 py-8 sm:px-6">
      <div
        className={`w-full max-w-xl overflow-hidden rounded-3xl border px-6 py-8 sm:px-10 sm:py-10 ${themeClasses.glassCard} ${themeClasses.border}`}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6 h-24 w-24">
            <div
              className={`absolute inset-0 rounded-full ${
                isDarkTheme ? 'bg-sky-400/10' : 'bg-sky-100'
              }`}
            />
            <div className="absolute inset-0 rounded-full border-2 border-sky-400/25" />
            <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-sky-500 border-r-indigo-400" />
            <div className="absolute inset-3 animate-pulse rounded-full border border-sky-400/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Icons.Project
                size={28}
                className={isDarkTheme ? 'text-sky-300' : 'text-sky-600'}
              />
            </div>
          </div>

          <h3 className={`text-xl font-bold tracking-tight sm:text-2xl ${themeClasses.textPrimary}`}>
            {title}
          </h3>
          <p className={`mt-2 max-w-md text-sm leading-relaxed ${themeClasses.textSecondary}`}>
            {subtitle}
          </p>

          <div
            className={`mt-6 h-1.5 w-full max-w-xs overflow-hidden rounded-full ${
              isDarkTheme ? 'bg-white/10' : 'bg-slate-200'
            }`}
          >
            <div className="h-full w-2/5 animate-[workspaceBar_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-400" />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-16 rounded-2xl ${shimmerBar(isDarkTheme)} animate-pulse`}
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
        <div
          className={`mt-3 h-36 rounded-2xl ${shimmerBar(isDarkTheme)} animate-pulse`}
        />
        <span className="sr-only">Loading projects</span>
      </div>
      <style>{`
        @keyframes workspaceBar {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(280%); }
        }
      `}</style>
    </div>
  );
};

export const SectionLoadingPanel: React.FC<{
  label?: string;
  minHeight?: number;
  className?: string;
}> = ({
  label = 'Loading this section',
  minHeight = 240,
  className = '',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <div
      className={`flex w-full flex-col justify-center gap-3 ${className}`}
      style={{ minHeight }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className={`text-center text-sm font-semibold ${themeClasses.textSecondary}`}>{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-12 rounded-xl ${shimmerBar(isDarkTheme)} animate-pulse`}
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
      <div
        className={`rounded-xl ${shimmerBar(isDarkTheme)} animate-pulse`}
        style={{ height: Math.max(minHeight - 96, 120) }}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};

export const CardLoadingSkeleton: React.FC<{
  metrics?: number;
  chartHeight?: number;
  className?: string;
}> = ({ metrics = 3, chartHeight = 112, className = '' }) => {
  const { isDarkTheme } = useTheme();

  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      <div className={`h-4 w-1/3 rounded-lg ${shimmerBar(isDarkTheme)} animate-pulse`} />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: metrics }).map((_, i) => (
          <div
            key={i}
            className={`h-14 rounded-xl ${shimmerBar(isDarkTheme)} animate-pulse`}
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
      <div
        className={`rounded-xl ${shimmerBar(isDarkTheme)} animate-pulse`}
        style={{ height: chartHeight }}
      />
    </div>
  );
};

export const InlineLoader: React.FC<{
  label?: string;
  className?: string;
}> = ({ label = 'Refreshing…', className = '' }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <div
      className={`inline-flex items-center justify-center gap-2 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-t-transparent ${
          isDarkTheme ? 'border-sky-300' : 'border-sky-600'
        }`}
      />
      {label ? (
        <span className={`text-sm font-semibold ${themeClasses.textSecondary}`}>{label}</span>
      ) : null}
    </div>
  );
};

export const ProjectsEmptyPanel: React.FC<{
  title?: string;
  message?: string;
  error?: string | null;
  onRetry?: () => void;
}> = ({
  title = 'No projects to show yet',
  message = 'There are no projects assigned to this account yet. If you expected to see work here, contact your administrator.',
  error,
  onRetry,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <div className="flex min-h-[62vh] w-full items-center justify-center px-3 py-8 sm:px-6">
      <div
        className={`w-full max-w-lg rounded-3xl border px-6 py-10 text-center sm:px-10 ${themeClasses.glassCard} ${themeClasses.border}`}
      >
        <div
          className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${
            isDarkTheme ? 'bg-sky-400/10 text-sky-300' : 'bg-sky-50 text-sky-600'
          }`}
        >
          <Icons.Project size={30} />
        </div>
        <h3 className={`text-xl font-bold tracking-tight ${themeClasses.textPrimary}`}>
          {title}
        </h3>
        <p className={`mx-auto mt-2 max-w-sm text-sm leading-relaxed ${themeClasses.textSecondary}`}>
          {error || message}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
};
