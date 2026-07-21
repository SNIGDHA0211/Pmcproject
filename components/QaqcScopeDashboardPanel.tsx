import React, { useMemo } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  FolderKanban,
  FlaskConical,
  TrendingUp,
  Upload,
} from 'lucide-react';
import type { MonthlyScope, Project, ProjectQualityStatusRecord } from '../types';
import type { HealthSafetyDashboardData } from '../services/api';
import QaqcHealthSafetyPanel from './QaqcHealthSafetyPanel';
import FrequencyChartDashboard from './FrequencyChartDashboard';
import { computeQaqcScopeSummary } from '../utils/qaqcScopeAnalytics';
import type { AssignedProjectOption } from '../utils/roleProjectAssignments';
import { getThemeClasses, useTheme } from '../utils/theme';

interface QaqcScopeDashboardPanelProps {
  scopes: MonthlyScope[];
  projectName?: string | null;
  selectedProject?: Project | null;
  assignedProjects?: AssignedProjectOption[];
  onProjectChange?: (projectTitle: string) => void;
  qualityRecord?: ProjectQualityStatusRecord | null;
  qualityLoading?: boolean;
  showFrequencyChart?: boolean;
  showHealthSafety?: boolean;
  hseDashboard?: HealthSafetyDashboardData | null;
  hseLoading?: boolean;
  onEditHealthSafety?: () => void;
  onDeleteHealthSafety?: () => void;
  canDeleteHealthSafety?: boolean;
  onNavigateTestingPhotos?: () => void;
}

const EmptyHint: React.FC<{
  title: string;
  hint: string;
  isDarkTheme: boolean;
  themeClasses: ReturnType<typeof getThemeClasses>;
}> = ({ title, hint, isDarkTheme, themeClasses }) => (
  <div
    className={`flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center ${
      isDarkTheme ? 'border-white/15 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/70'
    }`}
  >
    <p className={`text-xs font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}>{title}</p>
    <p className={`mt-1 max-w-xs text-[11px] leading-relaxed ${themeClasses.textMuted}`}>{hint}</p>
  </div>
);

const QaqcScopeDashboardPanel: React.FC<QaqcScopeDashboardPanelProps> = ({
  scopes,
  projectName = null,
  selectedProject = null,
  assignedProjects = [],
  onProjectChange,
  qualityRecord = null,
  qualityLoading = false,
  showFrequencyChart = false,
  showHealthSafety = false,
  hseDashboard = null,
  hseLoading = false,
  onEditHealthSafety,
  onDeleteHealthSafety,
  canDeleteHealthSafety = false,
  onNavigateTestingPhotos,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const summary = useMemo(() => computeQaqcScopeSummary(scopes), [scopes]);

  const cardCls = `rounded-2xl border ${
    isDarkTheme
      ? `${themeClasses.glassCard} ${themeClasses.border}`
      : 'border-slate-200/90 bg-white shadow-sm'
  }`;

  const kpis = [
    {
      label: 'Assigned',
      value: summary.total,
      icon: ClipboardList,
      tone: isDarkTheme ? 'text-blue-300 bg-blue-500/15' : 'text-blue-700 bg-blue-50',
    },
    {
      label: 'Pending',
      value: summary.pending,
      icon: Clock,
      tone: isDarkTheme ? 'text-amber-300 bg-amber-500/15' : 'text-amber-700 bg-amber-50',
    },
    {
      label: 'In Progress',
      value: summary.inProgress,
      icon: TrendingUp,
      tone: isDarkTheme ? 'text-indigo-300 bg-indigo-500/15' : 'text-indigo-700 bg-indigo-50',
    },
    {
      label: 'Completed',
      value: summary.completed,
      icon: CheckCircle2,
      tone: isDarkTheme ? 'text-emerald-300 bg-emerald-500/15' : 'text-emerald-700 bg-emerald-50',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Project strip + KPIs — one compact composition */}
      <section
        className={`${cardCls} overflow-hidden ${
          isDarkTheme
            ? 'bg-gradient-to-br from-indigo-950/40 via-slate-900/40 to-slate-900/20'
            : 'bg-gradient-to-br from-indigo-50/90 via-white to-sky-50/50'
        }`}
      >
        <div
          className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5 ${
            isDarkTheme ? 'border-white/10' : 'border-indigo-100/80'
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isDarkTheme ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-600 text-white'
              }`}
            >
              <FolderKanban size={18} strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Working Project
              </p>
              <p className={`truncate text-sm font-bold sm:text-base ${themeClasses.textPrimary}`}>
                {projectName ?? assignedProjects[0]?.title ?? 'No project assigned'}
              </p>
            </div>
          </div>

          {assignedProjects.length > 1 && onProjectChange && (
            <select
              value={projectName ?? ''}
              onChange={(e) => onProjectChange(e.target.value)}
              className={`max-w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none sm:min-w-[240px] ${
                isDarkTheme
                  ? `${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`
                  : 'border-slate-200 bg-white text-slate-900 shadow-sm'
              }`}
            >
              {assignedProjects.map((p) => (
                <option key={p.id} value={p.title}>
                  {p.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
          {kpis.map(({ label, value, icon: Icon, tone }, index) => (
            <div
              key={label}
              className={`flex items-center justify-between gap-2 px-4 py-3.5 sm:px-5 ${
                isDarkTheme ? 'bg-white/[0.02]' : 'bg-white/70'
              } ${index > 0 && index % 2 === 0 ? '' : ''}`}
            >
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${themeClasses.textSecondary}`}>
                  {label}
                </p>
                <p className={`mt-0.5 text-2xl font-black tabular-nums ${themeClasses.textPrimary}`}>{value}</p>
              </div>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <Icon size={16} strokeWidth={2.25} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {showHealthSafety && (
        <QaqcHealthSafetyPanel
          projectName={projectName}
          dashboard={hseDashboard}
          loading={hseLoading}
          onEdit={onEditHealthSafety}
          onDelete={onDeleteHealthSafety}
          canDelete={canDeleteHealthSafety}
        />
      )}

      {/* Quality — primary for QAQC */}
      {showFrequencyChart && (
        <section className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 px-0.5">
            <FlaskConical
              size={15}
              className={isDarkTheme ? 'text-indigo-300' : 'text-indigo-600'}
              strokeWidth={2.25}
            />
            <h3 className={`text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
              Quality · Material Testing
            </h3>
            <span className={`text-[10px] font-semibold ${themeClasses.textMuted}`}>
              Primary QAQC workspace
            </span>
            {onNavigateTestingPhotos && (
              <button
                type="button"
                onClick={onNavigateTestingPhotos}
                className={`ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition ${
                  isDarkTheme
                    ? 'bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                }`}
              >
                <Upload size={13} strokeWidth={2.5} />
                Upload Testing Photos
              </button>
            )}
          </div>

          {selectedProject ? (
            <div className="w-full min-w-0 overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-white/10">
              <FrequencyChartDashboard
                project={selectedProject}
                layout="default"
                defaultShowTable
              />
            </div>
          ) : (
            <div className={`${cardCls} p-5`}>
              <EmptyHint
                title="Select a project"
                hint="Choose an assigned project above to open the Material Testing Frequency Chart."
                isDarkTheme={isDarkTheme}
                themeClasses={themeClasses}
              />
            </div>
          )}
        </section>
      )}

      {!showFrequencyChart && !showHealthSafety && (
        <section className={`${cardCls} p-4 sm:p-5`}>
          <h3 className={`mb-3 text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
            Project Quality Snapshot
          </h3>
          {qualityLoading ? (
            <div className="flex min-h-[100px] items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : qualityRecord ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: 'Tests Required', value: qualityRecord.testsRequired },
                { label: 'Conducted', value: qualityRecord.testsConducted },
                { label: 'Passed', value: qualityRecord.testsPassed },
                { label: 'Failed', value: qualityRecord.testsFailed },
                { label: 'Performance', value: `${qualityRecord.qualityPerformance}%` },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-xl border px-3 py-2.5 text-center ${
                    isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}>
                    {item.label}
                  </p>
                  <p className={`mt-1 text-base font-black tabular-nums sm:text-lg ${themeClasses.textPrimary}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyHint
              title="No quality snapshot"
              hint="Quality KPIs will appear when monthly quality data is available."
              isDarkTheme={isDarkTheme}
              themeClasses={themeClasses}
            />
          )}
        </section>
      )}

    </div>
  );
};

export default QaqcScopeDashboardPanel;
