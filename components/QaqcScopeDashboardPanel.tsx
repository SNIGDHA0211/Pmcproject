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
import { CheckCircle2, ClipboardList, Clock, TrendingUp } from 'lucide-react';
import type { MonthlyScope, ProjectQualityStatusRecord } from '../types';
import type { HealthSafetyDashboardData } from '../services/api';
import QaqcHealthSafetyPanel from './QaqcHealthSafetyPanel';
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
  assignedProjects?: AssignedProjectOption[];
  onProjectChange?: (projectTitle: string) => void;
  qualityRecord?: ProjectQualityStatusRecord | null;
  qualityLoading?: boolean;
  hseDashboard?: HealthSafetyDashboardData | null;
  hseLoading?: boolean;
  onEditHealthSafety?: () => void;
  onDeleteHealthSafety?: () => void;
  canDeleteHealthSafety?: boolean;
}

const QaqcScopeDashboardPanel: React.FC<QaqcScopeDashboardPanelProps> = ({
  scopes,
  projectName = null,
  assignedProjects = [],
  onProjectChange,
  qualityRecord = null,
  qualityLoading = false,
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

  const cardCls = `rounded-2xl border p-4 sm:p-5 ${
    isDarkTheme
      ? `${themeClasses.glassCard} ${themeClasses.border}`
      : 'border-slate-200 bg-white shadow-sm'
  }`;

  const kpis = [
    {
      label: 'Assigned Scopes',
      value: summary.total,
      icon: ClipboardList,
      tone: isDarkTheme ? 'text-blue-300 bg-blue-500/15' : 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Pending',
      value: summary.pending,
      icon: Clock,
      tone: isDarkTheme ? 'text-amber-300 bg-amber-500/15' : 'text-amber-600 bg-amber-50',
    },
    {
      label: 'In Progress',
      value: summary.inProgress,
      icon: TrendingUp,
      tone: isDarkTheme ? 'text-indigo-300 bg-indigo-500/15' : 'text-indigo-600 bg-indigo-50',
    },
    {
      label: 'Completed',
      value: summary.completed,
      icon: CheckCircle2,
      tone: isDarkTheme ? 'text-emerald-300 bg-emerald-500/15' : 'text-emerald-600 bg-emerald-50',
    },
  ];

  const tooltipStyle = {
    backgroundColor: isDarkTheme ? '#1e293b' : '#fff',
    border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
    borderRadius: 12,
    fontSize: 12,
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {assignedProjects.length > 0 && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
            isDarkTheme
              ? 'border-indigo-500/25 bg-indigo-500/10'
              : 'border-indigo-200 bg-indigo-50/80'
          }`}
        >
          <div className="min-w-0">
            <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
              Assigned Project
            </p>
            <p className={`mt-0.5 truncate text-sm font-bold ${themeClasses.textPrimary}`}>
              {projectName ?? assignedProjects[0]?.title ?? '—'}
            </p>
          </div>
          {assignedProjects.length > 1 && onProjectChange && (
            <select
              value={projectName ?? ''}
              onChange={(e) => onProjectChange(e.target.value)}
              className={`max-w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none sm:min-w-[220px] ${
                isDarkTheme
                  ? `${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`
                  : 'border-slate-200 bg-white text-slate-900'
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
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={cardCls}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  {label}
                </p>
                <p className={`mt-1 text-2xl font-black tabular-nums sm:text-3xl ${themeClasses.textPrimary}`}>
                  {value}
                </p>
              </div>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <Icon size={18} strokeWidth={2.25} />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <QaqcHealthSafetyPanel
          projectName={projectName}
          dashboard={hseDashboard}
          loading={hseLoading}
          onEdit={onEditHealthSafety}
          onDelete={onDeleteHealthSafety}
          canDelete={canDeleteHealthSafety}
        />

        <div className={cardCls}>
          <h3 className={`mb-3 text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
            Project Quality Snapshot
          </h3>
          {qualityLoading ? (
            <div className="flex min-h-[120px] items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : qualityRecord ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
              {[
                { label: 'Tests Required', value: qualityRecord.testsRequired },
                { label: 'Conducted', value: qualityRecord.testsConducted },
                { label: 'Passed', value: qualityRecord.testsPassed },
                { label: 'Failed', value: qualityRecord.testsFailed },
                { label: 'Performance', value: `${qualityRecord.qualityPerformance}%` },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-xl border px-3 py-2.5 text-center ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'}`}
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
            <p className={`py-8 text-center text-sm ${themeClasses.textSecondary}`}>
              No quality data for the current reporting period.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`${cardCls} xl:col-span-1`}>
          <h3 className={`mb-3 text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
            Scope Status
          </h3>
          {statusData.length > 0 ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
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
          ) : (
            <p className={`py-10 text-center text-sm ${themeClasses.textSecondary}`}>No scope data</p>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {statusData.map((row) => (
              <span key={row.name} className={`inline-flex items-center gap-1.5 text-xs font-semibold ${themeClasses.textSecondary}`}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                {row.name}: {row.value}
              </span>
            ))}
          </div>
        </div>

        <div className={`${cardCls} xl:col-span-2`}>
          <h3 className={`mb-3 text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
            Avg Progress by Category
          </h3>
          {categoryData.length > 0 ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 8, right: 8, left: -12, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.08)' : '#e2e8f0'} />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }}
                    angle={-28}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [`${value}%`, 'Avg Progress']}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.fullCategory ?? ''
                    }
                  />
                  <Bar dataKey="progress" fill="#6366F1" radius={[6, 6, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className={`py-10 text-center text-sm ${themeClasses.textSecondary}`}>No category breakdown</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={cardCls}>
          <h3 className={`mb-3 text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
            Execution Summary
          </h3>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-xs font-semibold">
                <span className={themeClasses.textSecondary}>Overall Progress</span>
                <span className={themeClasses.textPrimary}>{summary.avgProgress}%</span>
              </div>
              <div className={`h-2.5 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-100'}`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all"
                  style={{ width: `${Math.min(100, summary.avgProgress)}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className={`rounded-xl border px-3 py-2.5 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}>Planned Qty</p>
                <p className={`mt-1 text-lg font-black tabular-nums ${themeClasses.textPrimary}`}>
                  {summary.plannedQty.toLocaleString('en-IN')}
                </p>
              </div>
              <div className={`rounded-xl border px-3 py-2.5 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}>Executed Qty</p>
                <p className={`mt-1 text-lg font-black tabular-nums text-emerald-500`}>
                  {summary.executedQty.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={cardCls}>
          <h3 className={`mb-3 text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
            Scopes by Project
          </h3>
          {projectData.length > 0 ? (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectData} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkTheme ? 'rgba(255,255,255,0.08)' : '#e2e8f0'} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }} />
                  <YAxis
                    type="category"
                    dataKey="project"
                    width={100}
                    tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#0EA5E9" radius={[0, 6, 6, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className={`py-8 text-center text-sm ${themeClasses.textSecondary}`}>No projects in scope list</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default QaqcScopeDashboardPanel;
