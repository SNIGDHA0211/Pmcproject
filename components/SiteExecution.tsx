import React, { useEffect, useMemo, useState } from 'react';
import { Project } from '../types';
import { Icons } from './Icons';
import { useTheme, getThemeClasses } from '../utils/theme';
import { fetchProjectProgressChart } from '../services/financialDataService';
import TutorialVideosPanel from './tutorialVideos/TutorialVideosPanel';
import TutorialWatchButton from './tutorialVideos/TutorialWatchButton';
import './siteDprMotion.css';

interface SiteExecutionProps {
  projects: Project[];
  onViewProject: (id: string) => void;
}

interface ProgressState {
  actual: number;   // latest cumulativeActual %
  loading: boolean;
}

const progressAccent = (actual: number, isDark: boolean): string => {
  if (actual >= 80) return '#10b981';
  if (actual >= 50) return isDark ? '#60a5fa' : '#4f46e5';
  if (actual > 0) return '#f59e0b';
  return isDark ? '#64748b' : '#94a3b8';
};

const SiteExecution: React.FC<SiteExecutionProps> = ({ projects, onViewProject }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const inProgressProjects = projects.filter((p) => p.status === 'IN_PROGRESS');

  // Map projectId → live progress from the same API as the dashboard KPI card
  const [progressMap, setProgressMap] = useState<Record<string, ProgressState>>({});

  useEffect(() => {
    if (inProgressProjects.length === 0) return;

    inProgressProjects.forEach((project) => {
      // Mark loading
      setProgressMap((prev) => ({
        ...prev,
        [project.id]: { actual: 0, loading: true },
      }));

      fetchProjectProgressChart(project.title)
        .then((chartPoints) => {
          // Last point's cumulativeActual is what the dashboard KPI card shows
          const last = chartPoints.length > 0 ? chartPoints[chartPoints.length - 1] : null;
          const actual = last ? Number(last.cumulativeActual ?? last.actual ?? 0) : 0;
          setProgressMap((prev) => ({
            ...prev,
            [project.id]: { actual, loading: false },
          }));
        })
        .catch(() => {
          // Fallback to static project data if API fails
          const fallback = project.progress?.construction ?? 0;
          setProgressMap((prev) => ({
            ...prev,
            [project.id]: { actual: fallback, loading: false },
          }));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inProgressProjects.length]);

  const summary = useMemo(() => {
    const loaded = inProgressProjects
      .map((p) => progressMap[p.id])
      .filter((s): s is ProgressState => Boolean(s && !s.loading));
    const avg =
      loaded.length > 0 ? loaded.reduce((sum, s) => sum + s.actual, 0) / loaded.length : null;
    return {
      active: inProgressProjects.length,
      avg,
      advanced: loaded.filter((s) => s.actual >= 80).length,
      notStarted: loaded.filter((s) => s.actual <= 0).length,
    };
  }, [inProgressProjects, progressMap]);

  const summaryTiles = [
    { label: 'Active sites', value: String(summary.active), accent: '#6366f1', icon: Icons.Execution },
    {
      label: 'Avg. site progress',
      value: summary.avg == null ? '—' : `${summary.avg.toFixed(1)}%`,
      accent: '#0ea5e9',
      icon: Icons.Activity,
    },
    { label: '80%+ complete', value: String(summary.advanced), accent: '#10b981', icon: Icons.Approve },
    { label: 'Not started', value: String(summary.notStarted), accent: '#f59e0b', icon: Icons.Calendar },
  ];

  return (
    <div className="pmc-se-page space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="pmc-se-head flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="pmc-se-head-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white">
            <Icons.Execution size={20} />
          </span>
          <div className="min-w-0">
            <h2 className={`text-xl font-black uppercase tracking-tight sm:text-2xl ${themeClasses.textPrimary}`}>
              Site Execution Overview
            </h2>
            <p
              className={`mt-0.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
            >
              <span className="pmc-se-live" aria-hidden />
              Live progress of all active construction sites
            </p>
          </div>
        </div>
        <TutorialWatchButton section="site_progress" variant="panel" isDark={isDarkTheme} />
      </div>

      {inProgressProjects.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summaryTiles.map((tile, index) => {
            const TileIcon = tile.icon;
            return (
              <div
                key={tile.label}
                className={`pmc-se-stat flex items-center gap-3 rounded-2xl border px-4 py-3 ${themeClasses.glassCard} ${themeClasses.border}`}
                style={{ '--se-accent': tile.accent, '--se-delay': `${index * 70}ms` } as React.CSSProperties}
              >
                <span className="pmc-se-stat-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                  <TileIcon size={17} />
                </span>
                <div className="min-w-0">
                  <p className={`truncate text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                    {tile.label}
                  </p>
                  <p className={`text-lg font-black tabular-nums leading-tight ${themeClasses.textPrimary}`}>
                    {tile.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        {inProgressProjects.map((project, index) => {
          const prog = progressMap[project.id];
          const actual = prog?.actual ?? 0;
          const isLoading = prog?.loading ?? true;
          const accent = progressAccent(isLoading ? 0 : actual, isDarkTheme);

          const progressColor =
            actual >= 80
              ? 'text-emerald-600'
              : actual >= 50
                ? isDarkTheme ? 'text-blue-400' : 'text-indigo-600'
                : actual > 0
                  ? 'text-amber-600'
                  : isDarkTheme ? themeClasses.textPrimary : 'text-slate-700';

          const barColor =
            actual >= 80
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
              : actual >= 50
                ? 'bg-gradient-to-r from-indigo-500 to-blue-500'
                : actual > 0
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                  : 'bg-gradient-to-r from-indigo-500 to-blue-500';

          return (
            <div
              key={project.id}
              role="button"
              tabIndex={0}
              onClick={() => onViewProject(project.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onViewProject(project.id);
                }
              }}
              className={`pmc-se-card group flex cursor-pointer flex-col rounded-2xl border p-4 shadow-md sm:rounded-[2rem] sm:p-5 lg:p-6 ${themeClasses.glassCard} ${themeClasses.border}${
                index >= 9 ? ' is-deferred' : ''
              }`}
              style={
                {
                  '--se-accent': accent,
                  '--se-delay': `${Math.min(index, 8) * 60}ms`,
                } as React.CSSProperties
              }
            >
              {/* Card Header */}
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className={`pmc-se-title font-black uppercase tracking-tight text-sm sm:text-base lg:text-lg ${themeClasses.textPrimary}`}>
                    {project.title}
                  </h3>
                  <p className={`mt-0.5 flex items-center gap-1 truncate text-xs font-semibold ${themeClasses.textSecondary}`}>
                    <Icons.MapPin size={12} className="shrink-0 opacity-70" />
                    <span className="truncate">{project.location || '—'}</span>
                  </p>
                </div>
                <div className="pmc-se-card-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <Icons.Execution size={18} />
                </div>
              </div>

              {/* Progress Row */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-bold ${themeClasses.textSecondary}`}>Site Progress</span>
                  {isLoading ? (
                    <span className={`h-4 w-10 animate-pulse rounded ${themeClasses.bgSecondary}`} />
                  ) : (
                    <span className={`font-black tabular-nums text-sm ${progressColor}`}>
                      {actual.toFixed(1)}%
                    </span>
                  )}
                </div>
                {isLoading ? (
                  <div className={`h-2 w-full animate-pulse rounded-full ${themeClasses.bgSecondary}`} />
                ) : (
                  <div className={`h-2 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'}`}>
                    <div
                      className={`pmc-se-bar h-full rounded-full transition-all duration-700 ${barColor}`}
                      style={{ width: `${Math.min(100, Math.max(0, actual))}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={`mt-5 flex items-center justify-between border-t pt-4 ${themeClasses.border}`}>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                    Manpower
                  </p>
                  <p className={`mt-0.5 text-sm font-black tabular-nums ${themeClasses.textPrimary}`}>
                    {project.safety?.totalManhours || 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                    Status
                  </p>
                  <p
                    className={`pmc-se-status mt-1 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-black ${
                      isDarkTheme
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    <span className="pmc-se-status-dot" aria-hidden />
                    On Track
                  </p>
                </div>
              </div>

              <span className="pmc-se-open" aria-hidden>
                Open project
                <Icons.ArrowRight size={12} />
              </span>
            </div>
          );
        })}

        {/* Empty State */}
        {inProgressProjects.length === 0 && (
          <div className={`pmc-se-empty col-span-1 flex flex-col items-center justify-center rounded-2xl border py-16 text-center sm:col-span-2 sm:rounded-[2rem] lg:col-span-3 ${themeClasses.glassCard} ${themeClasses.border}`}>
            <span className="pmc-se-empty-icon mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
              <Icons.Execution size={30} />
            </span>
            <h3 className={`text-base font-black uppercase sm:text-lg ${themeClasses.textPrimary}`}>
              No Active Sites
            </h3>
            <p className={`mt-1 text-sm ${themeClasses.textSecondary}`}>
              There are currently no projects in the execution phase.
            </p>
          </div>
        )}
      </div>

      <TutorialVideosPanel section="site_progress" />
    </div>
  );
};

export default SiteExecution;
