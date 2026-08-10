import React, { useEffect, useState } from 'react';
import { Project } from '../types';
import { Icons } from './Icons';
import { useTheme, getThemeClasses } from '../utils/theme';
import { fetchProjectProgressChart } from '../services/financialDataService';

interface SiteExecutionProps {
  projects: Project[];
  onViewProject: (id: string) => void;
}

interface ProgressState {
  actual: number;   // latest cumulativeActual %
  loading: boolean;
}

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className={`text-xl font-black uppercase tracking-tight sm:text-2xl ${themeClasses.textPrimary}`}>
          Site Execution Overview
        </h2>
        <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
          Live progress of all active construction sites
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        {inProgressProjects.map((project) => {
          const prog = progressMap[project.id];
          const actual = prog?.actual ?? 0;
          const isLoading = prog?.loading ?? true;

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
              onClick={() => onViewProject(project.id)}
              className={`group flex cursor-pointer flex-col rounded-2xl border p-4 shadow-md transition-all hover:shadow-xl hover:border-indigo-500/50 sm:rounded-[2rem] sm:p-5 lg:p-6 ${themeClasses.glassCard} ${themeClasses.border}`}
            >
              {/* Card Header */}
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className={`font-black uppercase tracking-tight transition-colors group-hover:text-indigo-400 text-sm sm:text-base lg:text-lg ${themeClasses.textPrimary}`}>
                    {project.title}
                  </h3>
                  <p className={`mt-0.5 truncate text-xs font-semibold ${themeClasses.textSecondary}`}>
                    {project.location}
                  </p>
                </div>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${themeClasses.bgSecondary}`}>
                  <Icons.Execution size={18} className="text-indigo-400" />
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
                      className={`h-full rounded-full transition-all duration-700 ${barColor}`}
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
                  <p className={`mt-0.5 text-sm font-black ${themeClasses.textPrimary}`}>
                    {project.safety?.totalManhours || 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                    Status
                  </p>
                  <p className={`mt-0.5 text-sm font-black ${themeClasses.success}`}>
                    On Track
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {inProgressProjects.length === 0 && (
          <div className={`col-span-1 flex flex-col items-center justify-center rounded-2xl border py-16 text-center sm:col-span-2 sm:rounded-[2rem] lg:col-span-3 ${themeClasses.glassCard} ${themeClasses.border}`}>
            <Icons.Execution size={44} className={`mb-4 opacity-20 ${themeClasses.textMuted}`} />
            <h3 className={`text-base font-black uppercase sm:text-lg ${themeClasses.textPrimary}`}>
              No Active Sites
            </h3>
            <p className={`mt-1 text-sm ${themeClasses.textSecondary}`}>
              There are currently no projects in the execution phase.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteExecution;
