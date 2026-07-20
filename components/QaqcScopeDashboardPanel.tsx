import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  FolderKanban,
  FlaskConical,
  TrendingUp,
} from 'lucide-react';
import type { MonthlyScope, Project, ProjectQualityStatusRecord } from '../types';
import type { HealthSafetyDashboardData } from '../services/api';
import QaqcHealthSafetyPanel from './QaqcHealthSafetyPanel';
import FrequencyChartDashboard from './FrequencyChartDashboard';
import {
  buildCategoryProgressData,
  buildProjectScopeData,
  buildStatusChartData,
  computeQaqcScopeSummary,
} from '../utils/qaqcScopeAnalytics';
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
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const summary = useMemo(() => computeQaqcScopeSummary(scopes), [scopes]);
  const statusData = useMemo(() => buildStatusChartData(summary), [summary]);
  const categoryData = useMemo(() => buildCategoryProgressData(scopes), [scopes]);
  const projectData = useMemo(() => buildProjectScopeData(scopes), [scopes]);
  const hasScopeCharts = statusData.length > 0 || categoryData.length > 0 || projectData.length > 0;

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

  const tooltipStyle = {
    backgroundColor: isDarkTheme ? '#1e293b' : '#fff',
    border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
    borderRadius: 12,
    fontSize: 12,
  };

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
          <div className="flex items-center gap-2 px-0.5">
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

      {!showFrequencyChart && (
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

      {/* Scope analytics — compact when empty */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <h3 className={`text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
            Scope Overview
          </h3>
          <span className={`text-[10px] font-semibold tabular-nums ${themeClasses.textMuted}`}>
            {summary.avgProgress}% avg progress
          </span>
        </div>

        {!hasScopeCharts ? (
          <div className={`${cardCls} p-4`}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div
                className={`rounded-xl border px-4 py-3 ${
                  isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'
                }`}
              >
                <p className={`text-[10px] font-bold uppercase ${themeClasses.textSecondary}`}>Overall Progress</p>
                <p className={`mt-1 text-2xl font-black tabular-nums ${themeClasses.textPrimary}`}>
                  {summary.avgProgress}%
                </p>
                <div className={`mt-2 h-2 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'}`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500"
                    style={{ width: `${Math.min(100, summary.avgProgress)}%` }}
                  />
                </div>
              </div>
              <div
                className={`rounded-xl border px-4 py-3 ${
                  isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'
                }`}
              >
                <p className={`text-[10px] font-bold uppercase ${themeClasses.textSecondary}`}>Planned Qty</p>
                <p className={`mt-1 text-2xl font-black tabular-nums ${themeClasses.textPrimary}`}>
                  {summary.plannedQty.toLocaleString('en-IN')}
                </p>
              </div>
              <div
                className={`rounded-xl border px-4 py-3 ${
                  isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'
                }`}
              >
                <p className={`text-[10px] font-bold uppercase ${themeClasses.textSecondary}`}>Executed Qty</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-emerald-500">
                  {summary.executedQty.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <p className={`mt-3 text-center text-[11px] ${themeClasses.textMuted}`}>
              Charts appear once monthly scopes are assigned to this project.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className={`${cardCls} p-4 lg:col-span-4`}>
              <h4 className={`mb-2 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Status Mix
              </h4>
              {statusData.length > 0 ? (
                <>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={44}
                          outerRadius={68}
                          paddingAngle={3}
                        >
                          {statusData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-1 flex flex-wrap justify-center gap-2.5">
                    {statusData.map((row) => (
                      <span
                        key={row.name}
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${themeClasses.textSecondary}`}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
                        {row.name}: {row.value}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyHint
                  title="No status data"
                  hint="Scope status chart will fill when scopes exist."
                  isDarkTheme={isDarkTheme}
                  themeClasses={themeClasses}
                />
              )}
            </div>

            <div className={`${cardCls} p-4 lg:col-span-5`}>
              <h4 className={`mb-2 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Progress by Category
              </h4>
              {categoryData.length > 0 ? (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} margin={{ top: 4, right: 8, left: -16, bottom: 28 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDarkTheme ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}
                      />
                      <XAxis
                        dataKey="category"
                        tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }}
                        angle={-24}
                        textAnchor="end"
                        height={48}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }}
                        unit="%"
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number) => [`${value}%`, 'Avg Progress']}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullCategory ?? ''}
                      />
                      <Bar dataKey="progress" fill="#6366F1" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyHint
                  title="No categories"
                  hint="Category progress appears when scopes have categories."
                  isDarkTheme={isDarkTheme}
                  themeClasses={themeClasses}
                />
              )}
            </div>

            <div className={`${cardCls} flex flex-col gap-3 p-4 lg:col-span-3`}>
              <div>
                <h4 className={`mb-2 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Execution
                </h4>
                <div className="mb-1 flex justify-between text-xs font-semibold">
                  <span className={themeClasses.textSecondary}>Progress</span>
                  <span className={themeClasses.textPrimary}>{summary.avgProgress}%</span>
                </div>
                <div className={`h-2 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-100'}`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500"
                    style={{ width: `${Math.min(100, summary.avgProgress)}%` }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div
                    className={`rounded-lg border px-2.5 py-2 ${
                      isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <p className={`text-[9px] font-bold uppercase ${themeClasses.textSecondary}`}>Planned</p>
                    <p className={`text-sm font-black tabular-nums ${themeClasses.textPrimary}`}>
                      {summary.plannedQty.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div
                    className={`rounded-lg border px-2.5 py-2 ${
                      isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <p className={`text-[9px] font-bold uppercase ${themeClasses.textSecondary}`}>Executed</p>
                    <p className="text-sm font-black tabular-nums text-emerald-500">
                      {summary.executedQty.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>

              {projectData.length > 0 && (
                <div className="min-h-0 flex-1">
                  <h4 className={`mb-2 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                    By Project
                  </h4>
                  <div className="h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={projectData}
                        layout="vertical"
                        margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                      >
                        <XAxis type="number" hide allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="project"
                          width={72}
                          tick={{ fontSize: 9, fill: isDarkTheme ? '#94a3b8' : '#64748b' }}
                        />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" fill="#0EA5E9" radius={[0, 4, 4, 0]} maxBarSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default QaqcScopeDashboardPanel;
