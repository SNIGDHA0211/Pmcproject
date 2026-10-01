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
import { SectionLoadingPanel } from './WorkspaceStatusPanels';

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

  const cardBase = isDarkTheme
    ? 'pmc-ov-card rounded-2xl pmc360-glass-panel-dark'
    : 'pmc-ov-card rounded-2xl pmc360-glass-panel-light';

  const kpis = [
    {
      label: 'Assigned',
      value: summary.total,
      icon: ClipboardList,
      accent: '#3b82f6',
    },
    {
      label: 'Pending',
      value: summary.pending,
      icon: Clock,
      accent: '#f59e0b',
    },
    {
      label: 'In Progress',
      value: summary.inProgress,
      icon: TrendingUp,
      accent: '#8b5cf6',
    },
    {
      label: 'Completed',
      value: summary.completed,
      icon: CheckCircle2,
      accent: '#10b981',
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ── HEADER & WORKING PROJECT STRIP ── */}
      <section
        className={`p-4 sm:p-5 ${cardBase}`}
        style={{ '--ov-accent': '#f43f5e', '--ov-delay': '0ms' } as React.CSSProperties}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 dark:border-white/10 border-slate-200/80">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #1e3a5f 130%)' }}
            >
              <FolderKanban size={22} strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-black uppercase tracking-wider sm:text-lg ${themeClasses.textPrimary}`}>
                  QAQC Scope &amp; Quality Workspace
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-rose-600 dark:text-rose-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                  Quality &amp; Testing
                </span>
              </div>
              <p className={`text-[11px] font-medium ${themeClasses.textMuted}`}>
                Project: <strong className={themeClasses.textPrimary}>{projectName ?? assignedProjects[0]?.title ?? 'No project assigned'}</strong>
              </p>
            </div>
          </div>

          {assignedProjects.length > 1 && onProjectChange && (
            <select
              value={projectName ?? ''}
              onChange={(e) => onProjectChange(e.target.value)}
              className={`max-w-full rounded-xl border px-3.5 py-2 text-xs font-bold outline-none sm:min-w-[240px] shadow-sm transition-all ${themeClasses.input}`}
            >
              {assignedProjects.map((p) => (
                <option key={p.id} value={p.title}>
                  {p.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* KPI TILE GRID */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map(({ label, value, icon: Icon, accent }, index) => (
            <div
              key={label}
              className={`p-3.5 sm:p-4 rounded-xl border pmc-ov-tile transition-all ${
                isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200/80 bg-slate-50/70'
              }`}
              style={{
                borderLeftWidth: 4,
                borderLeftColor: accent,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-wider ${themeClasses.textMuted}`}>
                    {label}
                  </p>
                  <p className={`mt-0.5 text-2xl font-black tabular-nums ${themeClasses.textPrimary}`}>{value}</p>
                </div>
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${accent} 0%, #1e3a5f 130%)` }}
                >
                  <Icon size={16} strokeWidth={2.25} />
                </span>
              </div>
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
            <div className={`${cardBase} p-5`}>
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
        <section className={`${cardBase} p-4 sm:p-5`}>
          <h3 className={`mb-3 text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
            Project Quality Snapshot
          </h3>
          {qualityLoading ? (
            <SectionLoadingPanel label="Loading quality snapshot" minHeight={100} />
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
