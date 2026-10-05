import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from './Icons';
import { getThemeClasses, useTheme } from '../utils/theme';
import './workspaceLoader.css';

const shimmerBar = (isDark: boolean) =>
  isDark
    ? 'bg-gradient-to-r from-white/5 via-white/15 to-white/5'
    : 'bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100';

const DEFAULT_LOADER_STEPS = ['Connecting to server', 'Fetching latest data', 'Preparing your view'];
const STEP_ADVANCE_MS = [900, 2200];
const SLOW_HINT_MS = 10000;

export type LoaderStep = string | { label: string; detail?: string };

export const FullScreenLoader: React.FC<{
  title: string;
  subtitle: string;
  isDark: boolean;
  steps?: LoaderStep[];
  standalone?: boolean;
  /** Small uppercase label above the title. */
  eyebrow?: string;
  /** Drive steps from outside; `steps.length` means every step is done. Omit for timed steps. */
  activeStep?: number;
  /** Show "Step x of n" with a determinate percentage bar instead of the sliding bar. */
  showProgress?: boolean;
  tone?: 'sky' | 'amber';
  icon?: React.ElementType;
}> = ({
  title,
  subtitle,
  isDark,
  steps = DEFAULT_LOADER_STEPS,
  standalone = false,
  eyebrow,
  activeStep: controlledStep,
  showProgress = false,
  tone = 'sky',
  icon: CoreIcon = Icons.Project,
}) => {
  const [timedStep, setTimedStep] = useState(0);
  const [showSlowHint, setShowSlowHint] = useState(false);
  const isControlled = controlledStep != null;
  const activeStep = isControlled ? controlledStep : timedStep;
  const allDone = activeStep >= steps.length;

  useEffect(() => {
    const timers = isControlled
      ? []
      : STEP_ADVANCE_MS.slice(0, Math.max(steps.length - 1, 0)).map((ms, i) =>
          window.setTimeout(() => setTimedStep(i + 1), ms),
        );
    timers.push(window.setTimeout(() => setShowSlowHint(true), SLOW_HINT_MS));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [steps.length, isControlled]);

  const progressPct = allDone
    ? 100
    : Math.round(((Math.max(activeStep, 0) + 0.5) / steps.length) * 100);
  const currentLabel = (() => {
    const step = steps[Math.min(activeStep, steps.length - 1)];
    return typeof step === 'string' ? step : step?.label;
  })();

  const overlay = (
    <div
      className={`pmc-wl-overlay ${isDark ? 'is-dark' : 'is-light'} tone-${tone} ${standalone ? 'is-standalone' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy={!allDone}
    >
      <div className="pmc-wl-card">
        <div className={`pmc-wl-orbit ${allDone ? 'is-done' : ''}`} aria-hidden="true">
          <div className="pmc-wl-orbit-glow" />
          <div className="pmc-wl-ring" />
          <div className="pmc-wl-ring-inner" />
          <div className="pmc-wl-orbit-dot" />
          <div className="pmc-wl-core">
            {allDone ? <Icons.Approve size={28} /> : <CoreIcon size={26} />}
          </div>
        </div>

        {eyebrow && <p className="pmc-wl-eyebrow">{eyebrow}</p>}
        <h3 className="pmc-wl-title" title={title}>{title}</h3>
        <p className="pmc-wl-subtitle">{subtitle}</p>

        {showProgress ? (
          <div className="pmc-wl-progress">
            <div className="pmc-wl-progress-meta">
              <span>
                {allDone ? 'Ready' : `Step ${activeStep + 1} of ${steps.length}`}
              </span>
              <span className="pmc-wl-progress-pct">{progressPct}%</span>
            </div>
            <div
              className="pmc-wl-bar is-determinate"
              style={{ '--wl-pct': `${progressPct}%` } as React.CSSProperties}
              aria-hidden="true"
            />
          </div>
        ) : (
          <div className="pmc-wl-bar" aria-hidden="true" />
        )}

        <ol className="pmc-wl-steps">
          {steps.map((step, i) => {
            const label = typeof step === 'string' ? step : step.label;
            const detail = typeof step === 'string' ? undefined : step.detail;
            const state = i < activeStep ? 'done' : i === activeStep ? 'active' : 'pending';
            return (
              <li
                key={label}
                className={`pmc-wl-step is-${state}`}
                style={{ '--wl-i': i } as React.CSSProperties}
              >
                <span className="pmc-wl-step-icon">
                  {state === 'done' ? <Icons.Approve size={14} /> : state === 'pending' ? i + 1 : null}
                </span>
                <span className="pmc-wl-step-label">
                  {label}
                  {detail && <span className="pmc-wl-step-detail">{detail}</span>}
                </span>
                <span className="pmc-wl-step-state">
                  {state === 'done' ? 'Done' : state === 'active' ? 'In progress' : 'Waiting'}
                </span>
              </li>
            );
          })}
        </ol>

        {showSlowHint && !allDone && (
          <p className="pmc-wl-hint">
            This is taking longer than usual. Please keep this tab open — if it doesn&apos;t finish soon,
            check your internet connection and refresh.
          </p>
        )}
        <span className="sr-only">
          {title}. {allDone ? 'Ready.' : `${currentLabel}.`}
        </span>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body);
};

export const WorkspaceLoadingPanel: React.FC<{
  title?: string;
  subtitle?: string;
  steps?: LoaderStep[];
}> = ({
  title = 'Loading your workspace',
  subtitle = 'Fetching your projects and preparing the dashboard. This only takes a moment.',
  steps,
}) => {
  const { isDarkTheme } = useTheme();

  return (
    <div className="min-h-[62vh] w-full" aria-hidden="true">
      <FullScreenLoader title={title} subtitle={subtitle} steps={steps} isDark={isDarkTheme} />
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
